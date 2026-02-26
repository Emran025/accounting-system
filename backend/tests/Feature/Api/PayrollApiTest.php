<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\PayrollCycle;
use App\Models\ChartOfAccount;
use App\Models\FiscalPeriod;
use App\Models\PayrollItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class PayrollApiTest extends TestCase
{
    use RefreshDatabase;
    
    protected $expenseAccount;
    protected $payableAccount;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup required mapping accounts
        $this->expenseAccount = \App\Models\ChartOfAccount::create([
            'account_name' => 'Salaries Expense',
            'account_code' => '5220',
            'account_type' => 'Expense',
            'is_active' => true
        ]);
        
        $this->payableAccount = ChartOfAccount::create([
            'account_name' => 'Salaries Payable',
            'account_code' => '2120',
            'account_type' => 'Liability',
            'is_active' => true
        ]);

        // Create fiscal period for current date
        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);
    }

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
            'payment_nature' => 'salary',
            'cycle_name' => 'Monthly Salary ' . now()->format('F Y'),
            'period_start' => now()->startOfMonth()->format('Y-m-d'),
            'period_end' => now()->endOfMonth()->format('Y-m-d'),
            'payment_date' => now()->format('Y-m-d'),
        ];

        $response = $this->authPost(route('api.payroll.generate'), $data);

        $this->assertSuccessResponse($response, 200); // Assuming 201 Created or 200 OK
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
             'period_start' => now()->startOfMonth()->format('Y-m-d'),
             'period_end' => now()->endOfMonth()->format('Y-m-d'),
             'payment_date' => now()->format('Y-m-d'),
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
             'period_start' => now()->startOfMonth()->format('Y-m-d'),
             'period_end' => now()->endOfMonth()->format('Y-m-d'),
             'payment_date' => now()->format('Y-m-d'),
             'total_gross' => 5000,
             'total_net' => 5000,
             'created_by' => $this->authenticatedUser->id
        ]);
        
        // Add item
        PayrollItem::create([
            'payroll_cycle_id' => $cycle->id,
            'employee_id' => Employee::factory()->create()->id,
            'base_salary' => 5000,
            'gross_salary' => 5000,
            'net_salary' => 5000,
            'status' => 'active'
        ]);

        // Need a cash account
        $cash = ChartOfAccount::factory()->asset()->create([
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
