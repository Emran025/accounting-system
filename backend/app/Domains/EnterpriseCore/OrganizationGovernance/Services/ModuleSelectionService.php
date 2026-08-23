<?php

namespace App\Domains\EnterpriseCore\OrganizationGovernance\Services;

use App\Domains\EnterpriseCore\OrganizationGovernance\Models\Module;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Persists business-module intent separately from operational activation.
 *
 * A selected module is an implementation choice. It remains inactive until
 * ModuleReadinessService confirms every structural, scope, and accounting
 * prerequisite for the selected working context.
 */
final class ModuleSelectionService
{
    public const SELECTED_MODULES_KEY = 'setup.selected_modules';

    /** @var list<string> */
    public const CONFIGURATION_MODULES = [
        'dashboard',
        'org_structure',
        'settings',
        'users',
        'roles_permissions',
    ];

    /**
     * These modules represent the four mandatory small-business domains:
     * enterprise core, commercial operations, finance, and supply chain.
     */
    public const CORE_STARTER_MODULES = ['sales', 'products', 'purchases', 'general_ledger'];

    public function __construct(
        private readonly ModuleReadinessService $readiness,
        private readonly OrganizationTemplateService $templates,
    ) {
    }

    /** @return list<string> */
    public function selectedModuleKeys(): array
    {
        $raw = Setting::query()
            ->where('setting_key', self::SELECTED_MODULES_KEY)
            ->value('setting_value');

        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            $decoded,
            static fn (mixed $key): bool => is_string($key) && $key !== ''
        )));
    }

    /** @param list<string> $moduleKeys */
    public function select(array $moduleKeys, ?int $userId = null): array
    {
        $knownKeys = Module::query()->pluck('module_key')->all();
        $unknownKeys = array_values(array_diff($moduleKeys, $knownKeys));
        if ($unknownKeys !== []) {
            throw ValidationException::withMessages([
                'module_keys' => ['One or more selected modules do not exist.'],
            ]);
        }

        $selected = array_values(array_diff(
            array_values(array_unique($moduleKeys)),
            self::CONFIGURATION_MODULES
        ));
        if ($selected === []) {
            throw ValidationException::withMessages([
                'module_keys' => ['Select at least one business module.'],
            ]);
        }

        DB::transaction(function () use ($selected): void {
            Setting::updateOrCreate(
                ['setting_key' => self::SELECTED_MODULES_KEY],
                ['setting_value' => json_encode($selected, JSON_THROW_ON_ERROR)]
            );

            // Deselected business modules cannot remain operational. This
            // prevents a stale activation from bypassing a later setup choice.
            Module::query()
                ->whereNotIn('module_key', self::CONFIGURATION_MODULES)
                ->whereNotIn('module_key', $selected)
                ->update(['is_active' => false]);
        });

        return $this->state($userId);
    }

    /** @return array{activated: list<string>, pending: array<string, list<string>>} */
    public function activateSelected(?int $userId): array
    {
        $readiness = $this->readiness->evaluate($userId);
        $evaluation = collect($readiness['modules'])->keyBy('module_key');
        $baselineReady = (bool) data_get($readiness, 'onboarding.baseline_ready', false);
        $selected = $this->selectedModuleKeys();
        $activated = [];
        $pending = [];

        if (!$baselineReady) {
            foreach ($selected as $moduleKey) {
                $pending[$moduleKey] = ['mandatory_baseline_incomplete'];
            }

            return compact('activated', 'pending');
        }

        foreach ($selected as $moduleKey) {
            $module = Module::query()->where('module_key', $moduleKey)->first();
            $status = $evaluation->get($moduleKey);

            if (!$module || !$status) {
                $pending[$moduleKey] = ['module_unknown'];
                continue;
            }

            if (!$status['requirements_satisfied']) {
                $pending[$moduleKey] = array_values(array_filter(
                    $status['reason_codes'],
                    static fn (string $reason): bool => $reason !== 'module_inactive'
                ));
                continue;
            }

            if (!$module->is_active) {
                $module->update(['is_active' => true]);
            }
            $activated[] = $moduleKey;
        }

        return compact('activated', 'pending');
    }

    /**
     * @return array{
     *   setup_required: bool,
     *   selected_module_keys: list<string>,
     *   active_module_keys: list<string>,
     *   pending_module_keys: list<string>,
     *   modules: list<array<string, mixed>>
     * }
     */
    public function state(?int $userId = null): array
    {
        $selected = $this->selectedModuleKeys();
        $readiness = $this->readiness->evaluate($userId);
        $evaluated = collect($readiness['modules']);
        $moduleNames = Module::query()
            ->get(['module_key', 'module_name_ar', 'module_name_en'])
            ->keyBy('module_key');
        $modules = $evaluated->map(function (array $module) use ($selected, $moduleNames): array {
            $catalogModule = $moduleNames->get($module['module_key']);
            $isConfigurationModule = in_array($module['module_key'], self::CONFIGURATION_MODULES, true);
            $isSelected = $isConfigurationModule || in_array($module['module_key'], $selected, true);

            return [
                ...$module,
                'module_name_ar' => $catalogModule?->module_name_ar,
                'module_name_en' => $catalogModule?->module_name_en,
                'is_configuration_module' => $isConfigurationModule,
                'is_selected' => $isSelected,
                'is_operational' => $module['ready'],
                'lifecycle' => $isConfigurationModule
                    ? 'configuration_access'
                    : (!$isSelected ? 'not_selected' : ($module['ready'] ? 'active' : 'selected_pending_readiness')),
            ];
        })->values();

        $selectedBusiness = $modules
            ->where('is_configuration_module', false)
            ->where('is_selected', true)
            ->values();
        $activeBusiness = $selectedBusiness->where('is_operational', true)->values();
        $pendingBusiness = $selectedBusiness->where('is_operational', false)->values();
        $baselineReady = (bool) data_get($readiness, 'onboarding.baseline_ready', false);
        $missingStarterModules = [];
        $activeStarterModules = $activeBusiness
            ->whereIn('module_key', self::CORE_STARTER_MODULES)
            ->pluck('module_key')
            ->all();
        $starterBundleActive = $baselineReady;

        return [
            // Core access is only granted after the mandated foundational,
            // operating, and cross-domain starter-bundle controls are ready.
            'setup_required' => !$starterBundleActive,
            'onboarding' => [
                ...($readiness['onboarding'] ?? []),
                'starter_bundle_active' => $starterBundleActive,
                'missing_starter_module_keys' => $missingStarterModules,
                'active_starter_module_keys' => $activeStarterModules,
            ],
            'selected_module_keys' => $selected,
            'active_module_keys' => $activeBusiness->pluck('module_key')->all(),
            'pending_module_keys' => $pendingBusiness->pluck('module_key')->all(),
            'modules' => $modules->all(),
            'organization_template' => $this->templates->state(),
        ];
    }

    public function isOperational(string $moduleKey, ?int $userId = null): bool
    {
        $state = $this->state($userId);
        $module = collect($state['modules'])->firstWhere('module_key', $moduleKey);

        return (bool) ($module['is_selected'] ?? false) && (bool) ($module['is_operational'] ?? false);
    }
}
