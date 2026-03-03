<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\BenefitsPlan;
use App\Models\BenefitsEnrollment;
use App\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BenefitsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_benefits_plans()
    {
        BenefitsPlan::factory()->count(3)->create();

        $response = $this->authGet(route('api.benefits.plans.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'plan_name',
                    'plan_type',
                    'is_active'
                ]
            ],
            'pagination'
        ]);
    }

    public function test_can_create_benefits_plan()
    {
        $data = [
            'plan_code' => 'HEALTH-2026',
            'plan_name' => 'Premium Health 2026',
            'plan_type' => 'health',
            'eligibility_rule' => 'all',
            'employee_contribution' => 100.00,
            'employer_contribution' => 500.00,
            'effective_date' => now()->toDateString()
        ];

        $response = $this->authPost(route('api.benefits.plans.store'), $data);

        $this->assertStatusResolved($response, 201);
        $response->assertJsonStructure(['success', 'id', 'plan_code']);
        $this->assertDatabaseHas('benefits_plans', [
            'plan_code' => 'HEALTH-2026',
            'plan_type' => 'health'
        ]);
    }

    public function test_can_view_benefits_plan()
    {
        $plan = BenefitsPlan::factory()->create();

        $response = $this->authGet(route('api.benefits.plans.show', $plan->id));

        $this->assertSuccessResponse($response);
        $response->assertJsonFragment([
            'id' => $plan->id,
            'plan_code' => $plan->plan_code
        ]);
    }

    public function test_can_update_benefits_plan()
    {
        $plan = BenefitsPlan::factory()->create([
            'is_active' => true
        ]);

        $data = [
            'is_active' => false,
            'description' => 'Updated desc'
        ];

        $response = $this->authPut(route('api.benefits.plans.update', $plan->id), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('benefits_plans', [
            'id' => $plan->id,
            'is_active' => false,
            'description' => 'Updated desc'
        ]);
    }

    public function test_can_list_benefits_enrollments()
    {
        BenefitsEnrollment::factory()->count(3)->create();

        $response = $this->authGet(route('api.benefits.enrollments.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'data',
            'pagination'
        ]);
    }

    public function test_can_create_benefits_enrollment()
    {
        $plan = BenefitsPlan::factory()->create();
        $employee = Employee::factory()->create();

        $data = [
            'plan_id' => $plan->id,
            'employee_id' => $employee->id,
            'enrollment_type' => 'new_hire',
            'effective_date' => now()->toDateString()
        ];

        $response = $this->authPost(route('api.benefits.enrollments.store'), $data);

        $this->assertStatusResolved($response, 201);
        $this->assertDatabaseHas('benefits_enrollments', [
            'plan_id' => $plan->id,
            'employee_id' => $employee->id,
            'status' => 'enrolled'
        ]);
    }

    public function test_can_update_benefits_enrollment()
    {
        $enrollment = BenefitsEnrollment::factory()->create([
            'status' => 'enrolled'
        ]);

        $data = [
            'status' => 'active',
            'notes' => 'Activated coverage'
        ];

        $response = $this->authPut(route('api.benefits.enrollments.update', $enrollment->id), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('benefits_enrollments', [
            'id' => $enrollment->id,
            'status' => 'active'
        ]);
    }
}
