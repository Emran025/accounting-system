<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\StructureNode;
use App\Models\StructureLink;
use App\Models\OrgMetaType;
use App\Models\TopologyRule;
use App\Models\OrgChangeHistory;
use App\Services\OrgStructureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class OrgStructureServiceTest extends TestCase
{
    use RefreshDatabase;

    private OrgStructureService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new OrgStructureService();
    }

    private function createMetaType(string $id, string $name, array $attributes = []): OrgMetaType
    {
        return OrgMetaType::create([
            'id' => $id,
            'display_name' => $name,
            'display_name_ar' => $name,
            'level_domain' => 'Financial',
            'is_assignable' => true,
            'sort_order' => 0,
        ]);
    }

    private function createNode(string $typeId, string $code, array $attributes = []): StructureNode
    {
        return StructureNode::create([
            'node_uuid' => Str::uuid()->toString(),
            'node_type_id' => $typeId,
            'code' => $code,
            'attributes_json' => $attributes,
            'status' => 'active',
            'created_by' => 1,
        ]);
    }

    public function test_record_change_creates_history_entry()
    {
        $this->service->recordChange(
            'StructureNode',
            'test-uuid-123',
            'CREATE',
            null,
            ['code' => 'TEST-01']
        );

        $this->assertDatabaseHas('org_change_history', [
            'entity_type' => 'StructureNode',
            'entity_id' => 'test-uuid-123',
            'change_type' => 'CREATE',
        ]);
    }

    public function test_can_create_node_with_link()
    {
        $companyType = $this->createMetaType('company', 'Company');
        $plantType = $this->createMetaType('plant', 'Plant');

        TopologyRule::create([
            'source_node_type_id' => 'plant',
            'target_node_type_id' => 'company',
            'description' => 'operates',
            'cardinality' => 'N:1',
            'is_active' => true,
        ]);

        $company = $this->createNode('company', 'COMP01');

        $result = $this->service->createNodeWithLink(
            [
                'node_type_id' => 'plant',
                'code' => 'PLNT01',
                'attributes' => [],
            ],
            [
                'target_node_uuid' => $company->node_uuid,
            ]
        );

        $this->assertArrayHasKey('node', $result);
        $this->assertArrayHasKey('link', $result);
        $this->assertEquals('PLNT01', $result['node']->code);
    }

    public function test_can_delete_check_allows_leaf_node()
    {
        $this->createMetaType('department', 'Department');
        $node = $this->createNode('department', 'DEPT01');

        $result = $this->service->canDeleteNode($node->node_uuid);

        $this->assertTrue($result['allowed']);
    }

    public function test_can_delete_check_prevents_node_with_children()
    {
        $companyType = $this->createMetaType('company', 'Company');
        $plantType = $this->createMetaType('plant', 'Plant');

        $parent = $this->createNode('company', 'PARENT');
        $child = $this->createNode('plant', 'CHILD');

        $rule = TopologyRule::create([
            'source_node_type_id' => 'plant',
            'target_node_type_id' => 'company',
            'description' => 'belongs_to',
            'cardinality' => 'N:1',
            'is_active' => true,
        ]);

        StructureLink::create([
            'source_node_uuid' => $child->node_uuid,
            'target_node_uuid' => $parent->node_uuid,
            'topology_rule_id' => $rule->id,
            'link_type' => 'assignment',
            'is_active' => true,
            'created_by' => 1,
        ]);

        $result = $this->service->canDeleteNode($parent->node_uuid);

        $this->assertFalse($result['allowed']);
    }

    public function test_get_statistics()
    {
        $this->createMetaType('company', 'Company');
        $this->createNode('company', 'COMPA');
        $this->createNode('company', 'COMPB');

        $stats = $this->service->getStatistics();

        $this->assertArrayHasKey('total_nodes', $stats);
        $this->assertEquals(2, $stats['total_nodes']);
    }

    public function test_run_integrity_check()
    {
        $this->createMetaType('company', 'Company');
        $this->createNode('company', 'VALIDCOMP');

        $issues = $this->service->runIntegrityCheck();

        $this->assertIsArray($issues);
    }

    public function test_bulk_update_status()
    {
        $this->createMetaType('unit', 'Unit');
        $node1 = $this->createNode('unit', 'UNIT1');
        $node2 = $this->createNode('unit', 'UNIT2');

        $result = $this->service->bulkUpdateStatus(
            [$node1->node_uuid, $node2->node_uuid],
            'inactive'
        );

        $this->assertEquals(2, $result['updated']);
        $this->assertEquals('inactive', $node1->fresh()->status);
        $this->assertEquals('inactive', $node2->fresh()->status);
    }
}
