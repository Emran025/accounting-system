<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\CompensationPlan;
use App\Models\CompensationEntry;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CompensationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_compensation_plans()
    {
        CompensationPlan::factory()->count(3)->create();

        $response = $this->authGet(route('api.compensation.plans.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'plan_name',
                    'plan_type',
                    'status'
                ]
            ],
            'pagination'
        ]);
    }

    public function test_can_create_compensation_plan()
    {
        $data = [
            'plan_name' => 'Annual Merit Review 2026',
            'plan_type' => 'merit',
            'fiscal_year' => '2026',
            'effective_date' => now()->toDateString(),
            'budget_pool' => 50000.00,
            'notes' => 'Test notes'
        ];

        $response = $this->authPost(route('api.compensation.plans.store'), $data);

        $this->assertStatusResolved($response, 201);
        $response->assertJsonStructure(['success', 'id', 'plan_name']);
        $this->assertDatabaseHas('compensation_plans', [
            'plan_name' => 'Annual Merit Review 2026',
            'status' => 'draft'
        ]);
    }

    public function test_can_view_compensation_plan()
    {
        $plan = CompensationPlan::factory()->create();

        $response = $this->authGet(route('api.compensation.plans.show', $plan->id));

        $this->assertSuccessResponse($response);
        $response->assertJsonFragment([
            'id' => $plan->id,
            'plan_name' => $plan->plan_name
        ]);
    }

    public function test_can_update_compensation_plan()
    {
        $plan = CompensationPlan::factory()->create([
            'status' => 'draft'
        ]);

        $data = [
            'status' => 'pending_approval',
            'notes' => 'Updated notes'
        ];

        $response = $this->authPut(route('api.compensation.plans.update', $plan->id), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('compensation_plans', [
            'id' => $plan->id,
            'status' => 'pending_approval',
            'notes' => 'Updated notes'
        ]);
    }

    public function test_can_list_compensation_entries()
    {
        CompensationEntry::factory()->count(3)->create();

        $response = $this->authGet(route('api.compensation.entries.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'data',
            'pagination'
        ]);
    }

    public function test_can_create_compensation_entry()
    {
        $plan = CompensationPlan::factory()->create();
        $employee = Employee::factory()->create();

        $data = [
            'compensation_plan_id' => $plan->id,
            'employee_id' => $employee->id,
            'current_salary' => 5000,
            'proposed_salary' => 5500,
            'justification' => 'Great performance'
        ];

        $response = $this->authPost(route('api.compensation.entries.store'), $data);

        $this->assertStatusResolved($response, 201);
        $this->assertDatabaseHas('compensation_entries', [
            'compensation_plan_id' => $plan->id,
            'employee_id' => $employee->id,
            'increase_amount' => 500
        ]);
    }

    public function test_can_update_compensation_entry_status()
    {
        $entry = CompensationEntry::factory()->create([
            'status' => 'pending'
        ]);

        $data = [
            'status' => 'approved'
        ];

        // Based on typical routing standards, this might be a PATCH or PUT. Wait, looking at Controller it should be a POST or PUT, let's use PUT and assume route exists.
        $response = $this->authPut(route('api.compensation.entries.status', $entry->id), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('compensation_entries', [
            'id' => $entry->id,
            'status' => 'approved'
        ]);
    }
}
