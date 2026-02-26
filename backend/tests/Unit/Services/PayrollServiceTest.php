<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\PayrollCycle;
use App\Models\PayrollItem;
use App\Models\PayrollTransaction;
use App\Services\PayrollService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class PayrollServiceTest extends TestCase
{
    use RefreshDatabase;

    private PayrollService $payrollService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedChartOfAccounts(); // Ideally seed payroll accounts specifically if needed
        $this->payrollService = app(PayrollService::class);
    }

    public function test_generate_payroll_salary_cycle()
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create([
            'base_salary' => 5000,
            'employment_status' => 'active',
            'is_active' => true
        ]);

        $data = [
            'cycle_type' => 'salary',
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'payment_date' => now()->endOfMonth(),
        ];

        $cycle = $this->payrollService->generatePayroll($data, $user);

        $this->assertInstanceOf(PayrollCycle::class, $cycle);
        $this->assertEquals(5000, $cycle->total_gross);
        $this->assertCount(1, $cycle->items);
        $this->assertEquals($employee->id, $cycle->items->first()->employee_id);
    }

    public function test_approve_payroll_workflow()
    {
        $admin = User::factory()->create();
        $employee = Employee::factory()->create(['base_salary' => 5000, 'user_id' => $admin->id]);
        
        // Cycle created by admin
        $cycle = PayrollCycle::create([
            'cycle_name' => 'Test Cycle',
            'cycle_type' => 'salary',
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'payment_date' => now()->endOfMonth(),
            'status' => 'draft',
            'created_by' => $admin->id,
            'total_gross' => 5000,
            'total_net' => 5000,
            'total_deductions' => 0
        ]);

        // First approval (Creator submits)
        $this->payrollService->approvePayroll($cycle->id, $admin);
        
        // Should be approved if no higher manager
        $this->assertEquals('approved', $cycle->fresh()->status);
        
        // Check GL Accrual
        $this->assertDatabaseHas('general_ledger', [
            'reference_type' => 'payroll_cycle',
            'reference_id' => $cycle->id,
            'entry_type' => 'DEBIT' // Salary Expense
        ]);
    }

    public function test_process_payment_full()
    {
        $user = User::factory()->create();
        $cycle = PayrollCycle::create([
            'cycle_name' => 'Payment Cycle',
            'cycle_type' => 'salary',
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'payment_date' => now()->endOfMonth(),
            'status' => 'approved',
            'total_net' => 1000,
            'created_by' => $user->id
        ]);

        $employee = Employee::factory()->create();
        $item = PayrollItem::create([
            'payroll_cycle_id' => $cycle->id,
            'employee_id' => $employee->id,
            'base_salary' => 1000,
            'total_allowances' => 0,
            'total_deductions' => 0,
            'gross_salary' => 1000,
            'net_salary' => 1000,
            'status' => 'active'
        ]);

        // Mock payment account (Cash)
        $account = \App\Models\ChartOfAccount::where('account_name', 'Cash')->first();

        $this->payrollService->processPayment($cycle->id, $account->id);

        $this->assertEquals('paid', $cycle->fresh()->status);
        
        $this->assertDatabaseHas('payroll_transactions', [
            'payroll_item_id' => $item->id,
            'amount' => 1000,
            'transaction_type' => 'payment'
        ]);

        // Check GL Payment
        $this->assertDatabaseHas('general_ledger', [
            'reference_type' => 'payroll_cycle',
            'reference_id' => $cycle->id,
            'account_id' => $account->id,
            'entry_type' => 'CREDIT'
        ]);
    }
}
