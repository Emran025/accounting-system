<?php

namespace App\Domains\EnterpriseCore\OrganizationGovernance\Services;

use App\Domains\EnterpriseCore\OrganizationGovernance\Models\Module;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\OperatingContext;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\StructureNode;
use App\Domains\Finance\GeneralLedger\Models\ChartOfAccount;
use App\Domains\Finance\GeneralLedger\Models\FiscalPeriod;

/**
 * Authoritative operational-readiness evaluator.
 *
 * Activation only means that a module is available for configuration. A module
 * becomes operational only after its required organization, selected working
 * unit, operating context, integrity, and accounting prerequisites pass.
 */
class ModuleReadinessService
{
    public const ONBOARDING_POLICY_VERSION = '2026-08-profile-driven-setup-v1';
    public const DEFAULT_ONBOARDING_PROFILE = 'guided_setup';

    /** @var list<string> */
    private const FOUNDATION_NODE_TYPES = ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER'];

    /** @var list<string> */
    private const CORE_OPERATING_NODE_TYPES = ['PLANT', 'STORAGE_LOC', 'SALES_ORG', 'PURCH_ORG'];

    /** @var list<string> */
    private const CORE_STARTER_MODULES = ['sales', 'products', 'purchases', 'general_ledger'];

    public function __construct(
        private readonly OrgStructureService $orgStructureService,
        private readonly OrganizationTemplateService $templates,
    ) {
    }

    public function evaluate(?int $userId = null): array
    {
        $templateProfile = $this->templates->profile();
        $profileKey = (string) ($templateProfile['template_key'] ?? self::DEFAULT_ONBOARDING_PROFILE);
        $coreOperatingNodeTypes = $this->coreOperatingNodeTypes($profileKey);
        $requiresOperatingContext = $this->requiresOperatingContext($profileKey);
        $starterModules = $this->starterModules($profileKey);
        $integrityIssues = $this->orgStructureService->runIntegrityCheck();
        $activeNodeTypes = $this->activeNodeTypes();
        $context = $this->defaultContext($userId);
        $workingUnit = $this->validateWorkingUnit($context);
        $operatingStructure = $this->validateOperatingStructure($context, $integrityIssues);
        $accountingReadiness = $this->accountingReadiness();
        $foundation = $this->foundationReadiness($activeNodeTypes, $integrityIssues, $accountingReadiness);
        $coreOperations = $this->coreOperationsReadiness($context, $activeNodeTypes, $integrityIssues, $operatingStructure, $coreOperatingNodeTypes, $requiresOperatingContext);
        $hasActiveStructure = $activeNodeTypes !== [];
        $modules = Module::query()->orderBy('category')->orderBy('sort_order')->get();

        $evaluated = $modules->map(function (Module $module) use (
            $activeNodeTypes,
            $integrityIssues,
            $workingUnit,
            $operatingStructure,
            $accountingReadiness,
            $hasActiveStructure
        ) {
            $requirements = $module->readiness_requirements ?? $this->defaultRequirements();
            $requiresOrgStructure = (bool) ($requirements['requires_org_structure'] ?? false);
            $requiresOperatingContext = (bool) ($requirements['requires_operating_context'] ?? false);
            // Legacy/custom module definitions without the new explicit flag
            // preserve their prior behavior. Seeded production modules are
            // migrated to require a selected working unit explicitly.
            $requiresWorkingUnit = (bool) ($requirements['requires_working_unit'] ?? $requiresOperatingContext);
            $requiresOpenFiscalPeriod = (bool) ($requirements['requires_open_fiscal_period'] ?? false);
            $requiresChartOfAccounts = (bool) ($requirements['requires_chart_of_accounts'] ?? false);
            $requiredNodeTypes = array_values($requirements['required_node_types'] ?? []);
            $missingNodeTypes = array_values(array_diff($requiredNodeTypes, $activeNodeTypes));
            $relevantIssues = $this->relevantIntegrityIssues($integrityIssues, $requiredNodeTypes);

            $reasons = [];
            if (!$module->is_active) {
                $reasons[] = 'module_inactive';
            }
            if ($requiresOrgStructure && !$hasActiveStructure) {
                $reasons[] = 'missing_organizational_structure';
            }
            if ($missingNodeTypes !== []) {
                $reasons[] = 'missing_required_structure';
            }
            if ($relevantIssues !== []) {
                $reasons[] = 'structure_integrity_failure';
            }
            if ($requiresWorkingUnit && !$workingUnit['ready']) {
                $reasons = [...$reasons, ...$workingUnit['reason_codes']];
            }
            if ($requiresOperatingContext && !$operatingStructure['ready']) {
                $reasons = [...$reasons, ...$operatingStructure['reason_codes']];
            }
            if ($requiresOpenFiscalPeriod && !$accountingReadiness['open_fiscal_period']['ready']) {
                $reasons[] = $accountingReadiness['open_fiscal_period']['reason_code'];
            }
            if ($requiresChartOfAccounts && !$accountingReadiness['chart_of_accounts']['ready']) {
                $reasons[] = $accountingReadiness['chart_of_accounts']['reason_code'];
            }

            $reasons = array_values(array_unique(array_filter($reasons)));
            $requirementsSatisfied = array_values(array_filter(
                $reasons,
                static fn (string $reason): bool => $reason !== 'module_inactive'
            )) === [];
            $ready = (bool) $module->is_active && $requirementsSatisfied;

            return [
                'module_key' => $module->module_key,
                'category' => $module->category,
                'is_active' => (bool) $module->is_active,
                'requires_org_structure' => $requiresOrgStructure,
                'requires_working_unit' => $requiresWorkingUnit,
                'requires_operating_context' => $requiresOperatingContext,
                'requires_open_fiscal_period' => $requiresOpenFiscalPeriod,
                'requires_chart_of_accounts' => $requiresChartOfAccounts,
                'required_node_types' => $requiredNodeTypes,
                'missing_node_types' => $missingNodeTypes,
                'integrity_issue_count' => count($relevantIssues),
                'status' => !$module->is_active ? 'inactive' : ($ready ? 'ready' : 'blocked'),
                'requirements_satisfied' => $requirementsSatisfied,
                'ready' => $ready,
                'reason_codes' => $reasons,
            ];
        });

        $activeModules = $evaluated->where('is_active', true);
        $readyModules = $activeModules->where('ready', true);
        $blockedModules = $activeModules->where('ready', false);
        $baselineReady = $foundation['ready'] && $coreOperations['ready'];
        $onboarding = [
            'policy_version' => self::ONBOARDING_POLICY_VERSION,
            'profile' => $profileKey,
            'baseline_ready' => $baselineReady,
            'phases' => [
                'foundation' => $foundation,
                'core_operations' => $coreOperations,
            ],
            'next_phase' => !$foundation['ready']
                ? 'foundation'
                : (!$coreOperations['ready'] ? 'core_operations' : 'module_activation'),
            'starter_module_keys' => $starterModules,
        ];

        return [
            'summary' => [
                'total_modules' => $modules->count(),
                'active_modules' => $activeModules->count(),
                'ready_modules' => $readyModules->count(),
                'blocked_modules' => $blockedModules->count(),
                // This gate governs initial launch. Optional modules may remain
                // blocked until their own scope-specific requirements are met.
                'configuration_ready' => $baselineReady,
            ],
            'onboarding' => $onboarding,
            'baseline_readiness' => [
                'ready' => $baselineReady,
                'foundation' => $foundation,
                'core_operations' => $coreOperations,
                'working_unit' => $workingUnit,
                'accounting' => $accountingReadiness,
            ],
            'operating_context' => $operatingStructure,
            'accounting_readiness' => $accountingReadiness,
            'integrity' => [
                'errors' => count(array_filter($integrityIssues, fn (array $issue) => $issue['type'] === 'ERROR')),
                'warnings' => count(array_filter($integrityIssues, fn (array $issue) => $issue['type'] === 'WARNING')),
            ],
            'modules' => $evaluated->values()->all(),
        ];
    }

    /**
     * Validates the explicit organizational unit selected as the user's working
     * scope. Selecting a warehouse or a financial center alone is insufficient.
     */
    public function validateWorkingUnit(?OperatingContext $context): array
    {
        $reasonCodes = [];
        $nodeUuids = [];

        if (!$context) {
            return [
                'ready' => false,
                'reason_codes' => ['missing_selected_working_unit'],
                'node_uuids' => [],
                'context_id' => null,
                'org_node_uuid' => null,
            ];
        }

        $anchor = $context->org_node_uuid ? StructureNode::find($context->org_node_uuid) : null;
        if (!$anchor || !$this->isActiveNode($anchor)) {
            $reasonCodes[] = 'missing_or_inactive_working_unit';
        } else {
            $nodeUuids[] = $anchor->node_uuid;
            $scope = $this->orgStructureService->resolveScopeContext($anchor->node_uuid);
            if (!isset($scope['resolved']['COMP_CODE'])) {
                $reasonCodes[] = 'working_unit_missing_company_code_path';
            }
        }

        return [
            'ready' => $reasonCodes === [],
            'reason_codes' => array_values(array_unique($reasonCodes)),
            'node_uuids' => $nodeUuids,
            'context_id' => $context->id,
            'org_node_uuid' => $context->org_node_uuid,
        ];
    }

    /**
     * Validates the selected operational resources and their structural links.
     */
    public function validateOperatingStructure(?OperatingContext $context, ?array $integrityIssues = null): array
    {
        $issues = $integrityIssues ?? $this->orgStructureService->runIntegrityCheck();
        $workingUnit = $this->validateWorkingUnit($context);
        $reasonCodes = $workingUnit['reason_codes'];
        $inScopeNodeUuids = $workingUnit['node_uuids'];

        if (!$context) {
            return ['ready' => false, 'reason_codes' => $reasonCodes, 'node_uuids' => []];
        }

        $context->loadMissing(['warehouse', 'posTerminal', 'costCenter', 'profitCenter']);

        foreach (['costCenter' => 'COST_CENTER'] as $relation => $expectedType) {
            $businessRecord = $context->{$relation};
            $nodeUuid = $businessRecord?->structure_node_uuid;
            $node = $nodeUuid ? StructureNode::find($nodeUuid) : null;
            if (!$node || !$this->isActiveNode($node) || $node->node_type_id !== $expectedType) {
                $reasonCodes[] = strtolower($expectedType) . '_not_structurally_linked';
                continue;
            }
            $inScopeNodeUuids[] = $node->node_uuid;
            $scope = $this->orgStructureService->resolveScopeContext($node->node_uuid);
            if (!isset($scope['resolved']['COMP_CODE'])) {
                $reasonCodes[] = strtolower($expectedType) . '_missing_company_code_path';
            }
        }

        foreach (['warehouse', 'posTerminal'] as $relation) {
            $record = $context->{$relation};
            if (!$record || !$context->org_node_uuid || $record->org_node_uuid !== $context->org_node_uuid) {
                $reasonCodes[] = $relation . '_not_attached_to_working_unit';
            }
        }

        $scopedIntegrityIssues = array_filter($issues, function (array $issue) use ($inScopeNodeUuids): bool {
            if (!in_array($issue['type'], ['ERROR', 'WARNING'], true)) {
                return false;
            }

            return in_array($issue['node_uuid'] ?? null, $inScopeNodeUuids, true);
        });
        if ($scopedIntegrityIssues !== []) {
            $reasonCodes[] = 'operating_structure_integrity_failure';
        }

        return [
            'ready' => $reasonCodes === [],
            'reason_codes' => array_values(array_unique($reasonCodes)),
            'node_uuids' => array_values(array_unique($inScopeNodeUuids)),
        ];
    }

    /**
     * Accounting baseline for live operations: current open period and a usable
     * chart that covers every fundamental account class.
     */
    public function accountingReadiness(): array
    {
        $today = now()->toDateString();
        $period = FiscalPeriod::query()
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->orderByDesc('start_date')
            ->first();

        $periodReady = $period && !$period->is_closed && !$period->is_locked;
        $periodReason = !$period
            ? 'missing_open_fiscal_period'
            : ($period->is_closed ? 'current_fiscal_period_closed' : ($period->is_locked ? 'current_fiscal_period_locked' : null));

        $requiredAccountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
        $activeAccountTypes = ChartOfAccount::query()
            ->where('is_active', true)
            ->pluck('account_type')
            ->map(fn ($type) => strtolower((string) $type))
            ->unique()
            ->values()
            ->all();
        $missingAccountTypes = array_values(array_diff($requiredAccountTypes, $activeAccountTypes));
        $accountCount = ChartOfAccount::query()->where('is_active', true)->count();
        $chartReady = $accountCount > 0 && $missingAccountTypes === [];
        $chartReason = $accountCount === 0 ? 'missing_chart_of_accounts' : ($missingAccountTypes !== [] ? 'missing_chart_of_account_types' : null);

        return [
            'ready' => (bool) $periodReady && $chartReady,
            'open_fiscal_period' => [
                'ready' => (bool) $periodReady,
                'reason_code' => $periodReason,
                'period' => $period ? [
                    'id' => $period->id,
                    'name' => $period->period_name,
                    'start_date' => $period->start_date,
                    'end_date' => $period->end_date,
                    'is_closed' => (bool) $period->is_closed,
                    'is_locked' => (bool) $period->is_locked,
                ] : null,
            ],
            'chart_of_accounts' => [
                'ready' => $chartReady,
                'reason_code' => $chartReason,
                'active_account_count' => $accountCount,
                'required_account_types' => $requiredAccountTypes,
                'active_account_types' => $activeAccountTypes,
                'missing_account_types' => $missingAccountTypes,
            ],
        ];
    }

    /** @return list<string> */
    public static function coreStarterModuleKeys(): array
    {
        return self::CORE_STARTER_MODULES;
    }

    /**
     * Phase 1 validates the legal/financial control plane before a user can
     * configure live operations. It deliberately requires complete linked
     * financial dimensions, not merely records with matching labels.
     */
    private function foundationReadiness(array $activeNodeTypes, array $integrityIssues, array $accountingReadiness): array
    {
        $missingNodeTypes = array_values(array_diff(self::FOUNDATION_NODE_TYPES, $activeNodeTypes));
        $relevantIssues = $this->relevantIntegrityIssues($integrityIssues, self::FOUNDATION_NODE_TYPES);
        $reasonCodes = [];

        if ($missingNodeTypes !== []) {
            $reasonCodes[] = 'missing_foundation_structure';
        }
        if ($relevantIssues !== []) {
            $reasonCodes[] = 'foundation_structure_integrity_failure';
        }
        if (!$accountingReadiness['chart_of_accounts']['ready']) {
            $reasonCodes[] = $accountingReadiness['chart_of_accounts']['reason_code'];
        }
        if (!$accountingReadiness['open_fiscal_period']['ready']) {
            $reasonCodes[] = $accountingReadiness['open_fiscal_period']['reason_code'];
        }

        $reasonCodes = array_values(array_unique(array_filter($reasonCodes)));

        return [
            'id' => 'foundation',
            'ready' => $reasonCodes === [],
            'required_node_types' => self::FOUNDATION_NODE_TYPES,
            'missing_node_types' => $missingNodeTypes,
            'integrity_issue_count' => count($relevantIssues),
            'reason_codes' => $reasonCodes,
        ];
    }

    /**
     * Phase 2 validates the smallest safe technology-commerce operating scope:
     * a selected company-linked working unit, financial dimensions, logistics
     * hierarchy, warehouse, and POS terminal. The organisation can later add
     * project, manufacturing, and HR structures without reopening this gate.
     */
    private function coreOperationsReadiness(?OperatingContext $context, array $activeNodeTypes, array $integrityIssues, array $operatingStructure, array $coreOperatingNodeTypes, bool $requiresOperatingContext): array
    {
        $missingNodeTypes = array_values(array_diff($coreOperatingNodeTypes, $activeNodeTypes));
        $relevantIssues = $this->relevantIntegrityIssues($integrityIssues, $coreOperatingNodeTypes);
        $validNodeTypes = $requiresOperatingContext
            ? $this->validCoreOperatingNodeTypes($context, $coreOperatingNodeTypes)
            : $coreOperatingNodeTypes;
        $unlinkedNodeTypes = array_values(array_diff($coreOperatingNodeTypes, $validNodeTypes));
        $reasonCodes = [];

        if ($requiresOperatingContext && !$operatingStructure['ready']) {
            $reasonCodes = [...$reasonCodes, ...$operatingStructure['reason_codes']];
        }
        if ($missingNodeTypes !== []) {
            $reasonCodes[] = 'missing_core_operating_structure';
        }
        if ($unlinkedNodeTypes !== []) {
            $reasonCodes[] = 'core_operating_structure_not_linked_to_working_company';
        }
        if ($relevantIssues !== []) {
            $reasonCodes[] = 'core_operating_structure_integrity_failure';
        }

        $reasonCodes = array_values(array_unique(array_filter($reasonCodes)));

        return [
            'id' => 'core_operations',
            'ready' => $reasonCodes === [],
            'required_node_types' => $coreOperatingNodeTypes,
            'missing_node_types' => $missingNodeTypes,
            'unlinked_node_types' => $unlinkedNodeTypes,
            'integrity_issue_count' => count($relevantIssues),
            'reason_codes' => $reasonCodes,
        ];
    }

    /** @return list<string> */
    private function validCoreOperatingNodeTypes(?OperatingContext $context, array $coreOperatingNodeTypes): array
    {
        if (!$context?->org_node_uuid) {
            return [];
        }

        $workingScope = $this->orgStructureService->resolveScopeContext($context->org_node_uuid);
        $companyUuid = $workingScope['resolved']['COMP_CODE']['node_uuid'] ?? null;
        if (!$companyUuid) {
            return [];
        }

        $valid = [];
        foreach ($coreOperatingNodeTypes as $nodeType) {
            $hasCompanyLinkedNode = StructureNode::query()
                ->where('node_type_id', $nodeType)
                ->where('status', 'active')
                ->get()
                ->contains(function (StructureNode $node) use ($companyUuid): bool {
                    $scope = $this->orgStructureService->resolveScopeContext($node->node_uuid);

                    return ($scope['resolved']['COMP_CODE']['node_uuid'] ?? null) === $companyUuid;
                });

            if ($hasCompanyLinkedNode) {
                $valid[] = $nodeType;
            }
        }

        return $valid;
    }

    /** @return list<string> */
    private function coreOperatingNodeTypes(string $profileKey): array
    {
        return match ($profileKey) {
            'single_store_retail', 'multi_site_retail', 'manufacturing' => ['PLANT', 'STORAGE_LOC', 'SALES_ORG', 'PURCH_ORG'],
            'single_store_service', 'professional_services' => ['SALES_ORG'],
            // Enterprise blueprints deliberately defer operational scope until
            // each legal entity/site is governed through the advanced designer.
            'enterprise_blueprint' => [],
            default => [],
        };
    }

    private function requiresOperatingContext(string $profileKey): bool
    {
        return in_array($profileKey, ['single_store_retail', 'multi_site_retail', 'manufacturing'], true);
    }

    /** @return list<string> */
    private function starterModules(string $profileKey): array
    {
        return match ($profileKey) {
            'single_store_retail', 'multi_site_retail' => ['sales', 'products', 'purchases', 'general_ledger'],
            'manufacturing' => ['sales', 'products', 'purchases', 'general_ledger'],
            'single_store_service', 'professional_services' => ['sales', 'general_ledger'],
            'enterprise_blueprint' => ['general_ledger'],
            default => self::CORE_STARTER_MODULES,
        };
    }

    private function activeNodeTypes(): array
    {
        return StructureNode::query()
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('valid_from')->orWhere('valid_from', '<=', now()->toDateString());
            })
            ->where(function ($query) {
                $query->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
            })
            ->pluck('node_type_id')
            ->unique()
            ->values()
            ->all();
    }

    private function defaultContext(?int $userId): ?OperatingContext
    {
        return OperatingContext::query()
            ->with(['warehouse', 'posTerminal', 'costCenter', 'profitCenter'])
            ->where('is_default', true)
            ->where(function ($query) use ($userId) {
                if ($userId !== null) {
                    $query->where('user_id', $userId)->orWhereNull('user_id');
                } else {
                    $query->whereNull('user_id');
                }
            })
            ->orderByRaw('user_id is null')
            ->first();
    }

    private function isActiveNode(StructureNode $node): bool
    {
        return $node->status === 'active'
            && (!$node->valid_from || $node->valid_from->isPast() || $node->valid_from->isToday())
            && (!$node->valid_to || $node->valid_to->isFuture() || $node->valid_to->isToday());
    }

    private function relevantIntegrityIssues(array $issues, array $requiredNodeTypes): array
    {
        if ($requiredNodeTypes === []) {
            return [];
        }

        return array_values(array_filter($issues, function (array $issue) use ($requiredNodeTypes): bool {
            if (!in_array($issue['node_type'] ?? null, $requiredNodeTypes, true)) {
                return false;
            }

            if (($issue['type'] ?? null) === 'ERROR') {
                return true;
            }

            return ($issue['type'] ?? null) === 'WARNING'
                && in_array($issue['category'] ?? null, ['missing_parent', 'inactive_with_links'], true);
        }));
    }

    private function defaultRequirements(): array
    {
        return [
            'requires_org_structure' => false,
            'requires_working_unit' => false,
            'required_node_types' => [],
            'requires_operating_context' => false,
            'requires_open_fiscal_period' => false,
            'requires_chart_of_accounts' => false,
        ];
    }
}
