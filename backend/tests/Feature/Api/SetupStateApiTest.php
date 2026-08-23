<?php

namespace Tests\Feature\Api;

use App\Domains\EnterpriseCore\OrganizationGovernance\Models\Module;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\OrgMetaType;
use App\Domains\EnterpriseCore\OrganizationGovernance\Models\StructureNode;
use App\Domains\EnterpriseCore\OrganizationGovernance\Services\ModuleSelectionService;
use App\Domains\Finance\GeneralLedger\Models\ChartOfAccount;
use App\Domains\Finance\GeneralLedger\Models\FiscalPeriod;
use App\Domains\Finance\ManagementAccounting\Models\CostCenter;
use App\Domains\Finance\ManagementAccounting\Models\ProfitCenter;
use App\Domains\SupplyChain\Inventory\Models\Warehouse;
use App\Domains\Commercial\SalesLifecycle\Models\PosTerminal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SetupStateApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Module::query()->update(['is_active' => false]);
        Module::query()->whereIn('module_key', ModuleSelectionService::CONFIGURATION_MODULES)->update(['is_active' => true]);
        $this->authenticateUser();
    }

    public function test_fresh_installation_requires_explicit_business_module_selection(): void
    {
        $response = $this->authGet(route('v2.setup.state'));

        $this->assertSuccessResponse($response);
        $response->assertJsonPath('data.setup_required', true)
            ->assertJsonPath('data.selected_module_keys', [])
            ->assertJsonPath('data.active_module_keys', [])
            ->assertJsonPath('data.onboarding.next_phase', 'foundation')
            ->assertJsonPath('data.onboarding.starter_bundle_active', false);
    }

    public function test_organization_template_catalog_is_available_before_the_profile_is_saved(): void
    {
        $response = $this->authGet(route('v2.setup.organization_templates'));

        $this->assertSuccessResponse($response);
        $response->assertJsonPath('data.is_applied', false)
            ->assertJsonPath('data.can_apply', false)
            ->assertJsonPath('data.templates.0.key', 'single_store_retail');
    }

    public function test_optional_reporting_module_cannot_bypass_the_mandatory_baseline(): void
    {
        $selected = $this->authPost(route('v2.setup.modules.select'), [
            'module_keys' => ['reports'],
        ]);

        $this->assertSuccessResponse($selected);
        $selected->assertJsonPath('data.setup_required', true)
            ->assertJsonPath('data.selected_module_keys', ['reports']);

        $activated = $this->authPost(route('v2.setup.modules.activate_selected'));

        $this->assertSuccessResponse($activated);
        $activated->assertJsonPath('data.activation.activated', [])
            ->assertJsonPath('data.activation.pending.reports', ['mandatory_baseline_incomplete'])
            ->assertJsonPath('data.state.setup_required', true);
        $this->assertDatabaseHas('modules', ['module_key' => 'reports', 'is_active' => false]);
    }

    public function test_guided_setup_baseline_activates_the_starter_bundle_and_keeps_optional_projects_scoped(): void
    {
        $this->configureTechnologyCommerceBaseline();

        $state = $this->authGet(route('v2.setup.state'));
        $this->assertSuccessResponse($state);
        $state->assertJsonPath('data.onboarding.profile', 'guided_setup')
            ->assertJsonPath('data.onboarding.phases.foundation.ready', true)
            ->assertJsonPath('data.onboarding.phases.core_operations.ready', true)
            ->assertJsonPath('data.onboarding.next_phase', 'module_activation');

        $selection = [...ModuleSelectionService::CORE_STARTER_MODULES, 'projects'];
        $selected = $this->authPost(route('v2.setup.modules.select'), ['module_keys' => $selection]);
        $this->assertSuccessResponse($selected);

        $activated = $this->authPost(route('v2.setup.modules.activate_selected'));

        $this->assertSuccessResponse($activated);
        $activated->assertJsonPath('data.activation.activated', ModuleSelectionService::CORE_STARTER_MODULES)
            ->assertJsonPath('data.activation.pending.projects.0', 'missing_required_structure')
            ->assertJsonPath('data.state.setup_required', false)
            ->assertJsonPath('data.state.onboarding.starter_bundle_active', true);
        $this->assertEqualsCanonicalizing(
            ModuleSelectionService::CORE_STARTER_MODULES,
            $activated->json('data.state.onboarding.active_starter_module_keys')
        );

        foreach (ModuleSelectionService::CORE_STARTER_MODULES as $moduleKey) {
            $this->assertDatabaseHas('modules', ['module_key' => $moduleKey, 'is_active' => true]);
        }
        $this->assertDatabaseHas('modules', ['module_key' => 'projects', 'is_active' => false]);
    }

    public function test_setup_rejects_empty_business_module_selection(): void
    {
        $response = $this->authPost(route('v2.setup.modules.select'), [
            'module_keys' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('module_keys');
    }

    private function configureTechnologyCommerceBaseline(): void
    {
        foreach (['CLIENT', 'COMP_CODE', 'CONTROLLING_AREA', 'COST_CENTER', 'PROFIT_CENTER', 'PLANT', 'STORAGE_LOC', 'SALES_ORG', 'PURCH_ORG'] as $type) {
            OrgMetaType::create([
                'id' => $type,
                'display_name' => $type,
                'display_name_ar' => $type,
                'level_domain' => 'Technology Commerce',
                'is_assignable' => true,
            ]);
        }

        $client = StructureNode::create(['node_type_id' => 'CLIENT', 'code' => 'TECH-CLIENT', 'status' => 'active']);
        $company = StructureNode::create(['node_type_id' => 'COMP_CODE', 'code' => 'TECH-1000', 'status' => 'active']);
        $controlling = StructureNode::create(['node_type_id' => 'CONTROLLING_AREA', 'code' => 'TECH-CA', 'status' => 'active']);
        $costNode = StructureNode::create(['node_type_id' => 'COST_CENTER', 'code' => 'TECH-CC', 'status' => 'active']);
        $profitNode = StructureNode::create(['node_type_id' => 'PROFIT_CENTER', 'code' => 'TECH-PC', 'status' => 'active']);
        $plant = StructureNode::create(['node_type_id' => 'PLANT', 'code' => 'TECH-HUB', 'status' => 'active']);
        $storage = StructureNode::create(['node_type_id' => 'STORAGE_LOC', 'code' => 'TECH-STOCK', 'status' => 'active']);
        $sales = StructureNode::create(['node_type_id' => 'SALES_ORG', 'code' => 'TECH-SALES', 'status' => 'active']);
        $purchasing = StructureNode::create(['node_type_id' => 'PURCH_ORG', 'code' => 'TECH-BUY', 'status' => 'active']);

        foreach ([
            [$company, $client],
            [$controlling, $company],
            [$costNode, $controlling],
            [$profitNode, $controlling],
            [$plant, $company],
            [$storage, $plant],
            [$sales, $company],
            [$purchasing, $company],
        ] as [$source, $target]) {
            DB::table('structure_links')->insert([
                'source_node_uuid' => $source->node_uuid,
                'target_node_uuid' => $target->node_uuid,
                'link_type' => 'assignment',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $costCenter = CostCenter::create([
            'code' => 'TECH-CC',
            'name' => 'Technology Operations',
            'type' => 'operational',
            'structure_node_uuid' => $costNode->node_uuid,
            'is_active' => true,
        ]);
        $profitCenter = ProfitCenter::create([
            'code' => 'TECH-PC',
            'name' => 'Technology Retail',
            'type' => 'branch',
            'structure_node_uuid' => $profitNode->node_uuid,
            'is_active' => true,
        ]);

        FiscalPeriod::create([
            'period_name' => 'FY '.now()->year,
            'start_date' => now()->startOfYear()->toDateString(),
            'end_date' => now()->endOfYear()->toDateString(),
            'is_closed' => false,
            'is_locked' => false,
        ]);
        foreach (['asset', 'liability', 'equity', 'revenue', 'expense'] as $index => $type) {
            ChartOfAccount::create([
                'account_code' => (string) (1000 + $index * 1000),
                'account_name' => ucfirst($type),
                'account_type' => $type,
                'is_active' => true,
            ]);
        }

        $warehouse = Warehouse::create([
            'code' => 'TECH-WH',
            'name' => 'Technology Device Warehouse',
            'org_node_uuid' => $company->node_uuid,
            'cost_center_id' => $costCenter->id,
            'profit_center_id' => $profitCenter->id,
            'status' => 'active',
            'is_active' => true,
        ]);
        $terminal = PosTerminal::create([
            'code' => 'TECH-POS',
            'name' => 'Technology Showroom POS',
            'org_node_uuid' => $company->node_uuid,
            'warehouse_id' => $warehouse->id,
            'cost_center_id' => $costCenter->id,
            'profit_center_id' => $profitCenter->id,
            'status' => 'active',
            'is_active' => true,
        ]);

        $configured = $this->authPost(route('v2.operating_context.configure'), [
            'org_node_uuid' => $company->node_uuid,
            'cost_center_id' => $costCenter->id,
            'pos_terminal_id' => $terminal->id,
        ]);

        $this->assertSuccessResponse($configured, 201);
    }
}
