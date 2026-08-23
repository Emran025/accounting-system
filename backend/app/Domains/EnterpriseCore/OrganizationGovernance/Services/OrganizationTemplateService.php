<?php

namespace App\Domains\EnterpriseCore\OrganizationGovernance\Services;

use App\Domains\EnterpriseCore\OrganizationGovernance\Models\FactoryCalendar;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\Setting;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\StructureNode;
use App\Domains\Finance\ForeignExchange\Models\Currency;
use App\Domains\Finance\GeneralLedger\Models\ChartOfAccount;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Converts business intent into the minimum safe organizational structure.
 *
 * The catalogue deliberately describes business templates rather than exposing
 * raw ERP meta-types. All writes still flow through OrgStructureService, so
 * metadata validation, topology rules, audit history and financial sync stay
 * authoritative for both templates and the advanced organization designer.
 */
final class OrganizationTemplateService
{
    public const PROFILE_KEY = 'setup.organization_profile';
    public const PRIMARY_GENERAL_LEDGER_REFERENCE = 'ACCORE-PRIMARY-GL';

    /** @var array<string, array<string, mixed>> */
    private const TEMPLATES = [
        'single_store_retail' => [
            'industry' => 'retail',
            'requires_inventory' => true,
            'label_ar' => 'متجر تجزئة واحد مع مخزون',
            'label_en' => 'Single-store retail with inventory',
            'description_ar' => 'لبقالة أو صيدلية أو متجر يبيع من نقطة بيع ويحتفظ بمخزون.',
            'generated_types' => ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER', 'PLANT', 'STORAGE_LOC', 'PURCH_ORG', 'SALES_ORG'],
        ],
        'single_store_service' => [
            'industry' => 'services',
            'requires_inventory' => false,
            'label_ar' => 'منشأة خدمات أو متجر بلا مخزون',
            'label_en' => 'Service business or stock-free store',
            'description_ar' => 'لشركة خدمات أو بيع مباشر لا يحتاج إلى موقع مخزون في البداية.',
            'generated_types' => ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER', 'SALES_ORG'],
        ],
        'multi_site_retail' => [
            'industry' => 'retail',
            'requires_inventory' => true,
            'label_ar' => 'تجزئة متعددة الفروع',
            'label_en' => 'Multi-site retail',
            'description_ar' => 'ينشئ الفرع الأول بأمان ويترك إضافة الفروع التالية لمسار توسع واضح.',
            'generated_types' => ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER', 'PLANT', 'STORAGE_LOC', 'PURCH_ORG', 'SALES_ORG'],
        ],
        'professional_services' => [
            'industry' => 'professional_services',
            'requires_inventory' => false,
            'label_ar' => 'خدمات مهنية ومشاريع',
            'label_en' => 'Professional services and projects',
            'description_ar' => 'لبيوت الخبرة والاستشارات والخدمات المهنية قبل تفعيل المشاريع والموارد البشرية.',
            'generated_types' => ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER', 'SALES_ORG'],
        ],
        'manufacturing' => [
            'industry' => 'manufacturing',
            'requires_inventory' => true,
            'label_ar' => 'تصنيع أو تشغيل بمخزون',
            'label_en' => 'Manufacturing or inventory operations',
            'description_ar' => 'ينشئ موقع تشغيل ومخزونًا ومبيعات ومشتريات، ثم يفتح التصنيع كتوسّع منفصل.',
            'generated_types' => ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER', 'PLANT', 'STORAGE_LOC', 'PURCH_ORG', 'SALES_ORG'],
        ],
        'enterprise_blueprint' => [
            'industry' => 'enterprise',
            'requires_inventory' => false,
            'label_ar' => 'مخطط مؤسسة كبيرة',
            'label_en' => 'Enterprise blueprint',
            'description_ar' => 'يؤسس الشركة والأبعاد الرقابية فقط، ثم يدار التوسع متعدد الكيانات والفروع عبر المصمم المتقدم.',
            'generated_types' => ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER'],
        ],
    ];

    public function __construct(private readonly OrgStructureService $orgStructure)
    {
    }

    /** @return array<string, mixed> */
    public function state(): array
    {
        $profile = $this->profile();

        return [
            'profile' => $profile,
            'templates' => collect(self::TEMPLATES)->map(function (array $template, string $key): array {
                return [
                    'key' => $key,
                    ...$template,
                ];
            })->values()->all(),
            'is_applied' => (bool) Arr::get($profile, 'applied_at'),
            'can_apply' => $profile !== null && !$this->hasActiveFoundation(),
        ];
    }

    /** @return array<string, mixed>|null */
    public function profile(): ?array
    {
        $raw = Setting::query()->where('setting_key', self::PROFILE_KEY)->value('setting_value');
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /** @param array<string, mixed> $data */
    public function saveProfile(array $data): array
    {
        $templateKey = (string) ($data['template_key'] ?? '');
        if (!isset(self::TEMPLATES[$templateKey])) {
            throw ValidationException::withMessages(['template_key' => ['Select a supported organization template.']]);
        }

        $template = self::TEMPLATES[$templateKey];
        $countryCode = strtoupper(trim((string) ($data['country_code'] ?? '')));
        $currencyId = $data['currency_id'] ?? null;
        if (!$currencyId || !Currency::active()->whereKey($currencyId)->exists()) {
            throw ValidationException::withMessages(['currency_id' => ['Select an active operating currency.']]);
        }
        if ($countryCode === '') {
            throw ValidationException::withMessages(['country_code' => ['Select the legal country or region.']]);
        }

        $profile = [
            'template_key' => $templateKey,
            'industry' => $template['industry'],
            'organization_size' => (string) ($data['organization_size'] ?? 'small'),
            'company_name' => trim((string) ($data['company_name'] ?? '')),
            'company_code' => strtoupper(trim((string) ($data['company_code'] ?? ''))),
            'country_code' => $countryCode,
            'currency_id' => (int) $currencyId,
            'primary_site_name' => trim((string) ($data['primary_site_name'] ?? '')),
            'primary_site_code' => strtoupper(trim((string) ($data['primary_site_code'] ?? ''))),
            'factory_calendar_id' => filled($data['factory_calendar_id'] ?? null) ? (int) $data['factory_calendar_id'] : null,
            'language' => in_array(($data['language'] ?? null), ['ar-SA', 'en-US'], true) ? $data['language'] : 'ar-SA',
            'inventory_enabled' => (bool) $template['requires_inventory'],
            'updated_at' => now()->toISOString(),
            'applied_at' => Arr::get($this->profile(), 'applied_at'),
        ];

        if ($profile['company_name'] === '' || $profile['company_code'] === '') {
            throw ValidationException::withMessages(['company_name' => ['Company name and code are required.']]);
        }
        if (!preg_match('/^[A-Z0-9_-]{2,20}$/', $profile['company_code'])) {
            throw ValidationException::withMessages(['company_code' => ['Company code must use 2–20 uppercase letters, numbers, underscores, or hyphens.']]);
        }

        if ($profile['inventory_enabled']) {
            if ($profile['primary_site_name'] === '' || $profile['primary_site_code'] === '') {
                throw ValidationException::withMessages(['primary_site_name' => ['Site name and code are required for inventory templates.']]);
            }
            $calendar = $profile['factory_calendar_id'] ? FactoryCalendar::active()->find($profile['factory_calendar_id']) : null;
            if (!$calendar) {
                throw ValidationException::withMessages(['factory_calendar_id' => ['Select an active operating calendar for the primary site.']]);
            }
            if (strcasecmp($calendar->country_code, $profile['country_code']) !== 0) {
                throw ValidationException::withMessages(['factory_calendar_id' => ['The operating calendar must match the legal country.']]);
            }
        }

        Setting::updateOrCreate(
            ['setting_key' => self::PROFILE_KEY],
            ['setting_value' => json_encode($profile, JSON_THROW_ON_ERROR)]
        );

        return $this->state();
    }

    /** @return array<string, mixed> */
    public function apply(?int $userId = null): array
    {
        $profile = $this->profile();
        if (!$profile) {
            throw ValidationException::withMessages(['profile' => ['Save the organization profile before applying a template.']]);
        }
        if (filled($profile['applied_at'] ?? null)) {
            throw ValidationException::withMessages(['profile' => ['This organization template has already been applied. Use the advanced designer for controlled expansion.']]);
        }
        if ($this->hasActiveFoundation()) {
            throw ValidationException::withMessages(['profile' => ['An active organizational foundation already exists. Template application is blocked to prevent duplicate structures.']]);
        }

        $templateKey = (string) $profile['template_key'];
        $template = self::TEMPLATES[$templateKey] ?? null;
        if (!$template) {
            throw ValidationException::withMessages(['template_key' => ['The saved template is no longer available.']]);
        }
        $this->assertBaselineLedger();

        return DB::transaction(function () use ($profile, $template, $userId): array {
            $client = $this->orgStructure->createNodeWithLinks([
                'node_type_id' => 'CLIENT',
                'code' => 'CLIENT-'.$profile['company_code'],
                'attributes' => [
                    'name' => $profile['company_name'],
                    'default_language' => $profile['language'],
                ],
                'status' => 'active',
            ])['node'];

            $company = $this->orgStructure->createNodeWithLinks([
                'node_type_id' => 'COMP_CODE',
                'code' => $profile['company_code'],
                'attributes' => [
                    'name' => $profile['company_name'],
                    'country_code' => $profile['country_code'],
                    'currency_id' => (string) $profile['currency_id'],
                    'chart_of_accounts_id' => self::PRIMARY_GENERAL_LEDGER_REFERENCE,
                    'fiscal_year_variant' => 'K4',
                    'language' => $profile['language'],
                ],
                'status' => 'active',
            ], [['target_node_uuid' => $client->node_uuid, 'validate_constraints' => true]])['node'];

            $controlling = $this->orgStructure->createNodeWithLinks([
                'node_type_id' => 'CONTROLLING_AREA',
                'code' => 'CA-'.$profile['company_code'],
                'attributes' => [
                    'name' => 'منطقة التحكم — '.$profile['company_name'],
                    'currency_id' => (string) $profile['currency_id'],
                ],
                'status' => 'active',
            ], [['target_node_uuid' => $company->node_uuid, 'validate_constraints' => true]])['node'];

            $costCenter = $this->orgStructure->createNodeWithLinks([
                'node_type_id' => 'COST_CENTER',
                'code' => 'CC-'.$profile['company_code'],
                'attributes' => [
                    'name' => 'مركز تكلفة — '.$profile['company_name'],
                    'cost_center_category' => 'operational',
                ],
                'status' => 'active',
            ], [['target_node_uuid' => $controlling->node_uuid, 'validate_constraints' => true]])['node'];

            $profitCenter = $this->orgStructure->createNodeWithLinks([
                'node_type_id' => 'PROFIT_CENTER',
                'code' => 'PC-'.$profile['company_code'],
                'attributes' => [
                    'name' => 'مركز ربح — '.$profile['company_name'],
                    'profit_center_group' => 'default',
                ],
                'status' => 'active',
            ], [['target_node_uuid' => $controlling->node_uuid, 'validate_constraints' => true]])['node'];

            $created = [
                'client' => $client->node_uuid,
                'company_code' => $company->node_uuid,
                'controlling_area' => $controlling->node_uuid,
                'cost_center' => $costCenter->node_uuid,
                'profit_center' => $profitCenter->node_uuid,
            ];

            if (($template['requires_inventory'] ?? false) === true) {
                $site = $this->orgStructure->createNodeWithLinks([
                    'node_type_id' => 'PLANT',
                    'code' => $profile['primary_site_code'],
                    'attributes' => [
                        'name' => $profile['primary_site_name'],
                        'country_code' => $profile['country_code'],
                        'factory_calendar_id' => (string) $profile['factory_calendar_id'],
                        'language' => $profile['language'],
                    ],
                    'status' => 'active',
                ], [
                    ['target_node_uuid' => $company->node_uuid, 'validate_constraints' => true],
                    ['target_node_uuid' => $profitCenter->node_uuid, 'validate_constraints' => true],
                ])['node'];

                $storage = $this->orgStructure->createNodeWithLinks([
                    'node_type_id' => 'STORAGE_LOC',
                    'code' => 'ST-'.$profile['primary_site_code'],
                    'attributes' => ['name' => 'مخزون '.$profile['primary_site_name']],
                    'status' => 'active',
                ], [['target_node_uuid' => $site->node_uuid, 'validate_constraints' => true]])['node'];

                $purchasing = $this->orgStructure->createNodeWithLinks([
                    'node_type_id' => 'PURCH_ORG',
                    'code' => 'PO-'.$profile['company_code'],
                    'attributes' => ['name' => 'مشتريات '.$profile['company_name']],
                    'status' => 'active',
                ], [
                    ['target_node_uuid' => $company->node_uuid, 'validate_constraints' => true],
                    ['target_node_uuid' => $site->node_uuid, 'validate_constraints' => true],
                ])['node'];

                $sales = $this->createSalesOrganization($profile, $company->node_uuid);
                $this->orgStructure->createLink($site->node_uuid, $sales->node_uuid);
                $created += [
                    'site' => $site->node_uuid,
                    'storage_location' => $storage->node_uuid,
                    'purchasing_organization' => $purchasing->node_uuid,
                    'sales_organization' => $sales->node_uuid,
                ];
            } elseif (in_array('SALES_ORG', $template['generated_types'], true)) {
                $sales = $this->createSalesOrganization($profile, $company->node_uuid);
                $created['sales_organization'] = $sales->node_uuid;
            }

            $profile['applied_at'] = now()->toISOString();
            $profile['applied_by'] = $userId;
            $profile['created_nodes'] = $created;
            Setting::updateOrCreate(
                ['setting_key' => self::PROFILE_KEY],
                ['setting_value' => json_encode($profile, JSON_THROW_ON_ERROR)]
            );

            return [
                'profile' => $profile,
                'created_nodes' => $created,
                'next_actions' => [
                    'Create a scoped warehouse and POS terminal through the master-data flow before configuring the operating context.',
                    'Use the advanced organization designer only when adding branches, channels, sales teams, HR, projects, or other governed extensions.',
                ],
            ];
        });
    }

    private function createSalesOrganization(array $profile, string $companyUuid): StructureNode
    {
        return $this->orgStructure->createNodeWithLinks([
            'node_type_id' => 'SALES_ORG',
            'code' => 'SO-'.$profile['company_code'],
            'attributes' => [
                'name' => 'مبيعات '.$profile['company_name'],
                'currency_id' => (string) $profile['currency_id'],
            ],
            'status' => 'active',
        ], [['target_node_uuid' => $companyUuid, 'validate_constraints' => true]])['node'];
    }

    private function hasActiveFoundation(): bool
    {
        return StructureNode::query()
            ->where('status', 'active')
            ->whereIn('node_type_id', ['COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER'])
            ->exists();
    }

    private function assertBaselineLedger(): void
    {
        $required = ['asset', 'liability', 'equity', 'revenue', 'expense'];
        $available = ChartOfAccount::query()
            ->where('is_active', true)
            ->pluck('account_type')
            ->map(fn ($type) => strtolower((string) $type))
            ->unique()
            ->all();

        if (array_diff($required, $available) !== []) {
            throw ValidationException::withMessages([
                'chart_of_accounts' => ['The seeded baseline chart of accounts is incomplete. Restore the basic chart before applying an organization template.'],
            ]);
        }
    }
}
