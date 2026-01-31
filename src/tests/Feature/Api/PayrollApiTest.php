<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\PayrollCycle;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PayrollApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_payroll_via_api()
    {
        $this->authenticateUser();
        // Create an active employee
        Employee::factory()->create([
            'is_active' => true,
            'employment_status' => 'active',
            'base_salary' => 5000
        ]);

        $data = [
            'cycle_type' => 'salary',
            'period_start' => now()->startOfMonth()->format('Y-m-d'),
            'period_end' => now()->endOfMonth()->format('Y-m-d'),
        ];

        $response = $this->authPost(route('api.payroll.generate'), $data);

        $this->assertSuccessResponse($response, 201); // Assuming 201 Created or 200 OK
        $this->assertDatabaseHas('payroll_cycles', [
            'created_by' => $this->authenticatedUser->id,
            'cycle_type' => 'salary'
        ]);
    }

    public function test_approve_payroll_via_api()
    {
        $this->authenticateUser();
        $cycle = PayrollCycle::create([
             'cycle_name' => 'Test Cycle',
             'cycle_type' => 'salary',
             'status' => 'draft',
             'total_gross' => 5000,
             'total_net' => 5000,
             'total_deductions' => 0,
             'created_by' => $this->authenticatedUser->id
        ]);

        $response = $this->authPost(route('api.payroll.approve', ['id' => $cycle->id]));

        $this->assertSuccessResponse($response);
        $this->assertEquals('approved', $cycle->fresh()->status);
    }

    public function test_process_payroll_payment_via_api()
    {
        $this->authenticateUser();
        $cycle = PayrollCycle::create([
             'cycle_name' => 'Paid Cycle',
             'cycle_type' => 'salary',
             'status' => 'approved',
             'total_gross' => 5000,
             'total_net' => 5000,
             'created_by' => $this->authenticatedUser->id
        ]);
        
        // Add item
        \App\Models\PayrollItem::create([
            'payroll_cycle_id' => $cycle->id,
            'employee_id' => Employee::factory()->create()->id,
            'gross_salary' => 5000,
            'net_salary' => 5000,
            'status' => 'active'
        ]);

        // Need a cash account
        $cash = \App\Models\ChartOfAccount::factory()->asset()->create([
            'account_name' => 'Cash',
            'account_code' => '1110'
        ]);

        $response = $this->authPost(route('api.payroll.payment', ['id' => $cycle->id]), [
            'account_id' => $cash->id
        ]);

        $this->assertSuccessResponse($response);
        $this->assertEquals('paid', $cycle->fresh()->status);
    }
}
