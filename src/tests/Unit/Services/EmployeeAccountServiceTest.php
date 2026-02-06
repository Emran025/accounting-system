<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\EmployeeAccountService;
use App\Models\Employee;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\PayrollTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EmployeeAccountServiceTest extends TestCase
{
    use RefreshDatabase;

    private EmployeeAccountService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new EmployeeAccountService();
    }

    public function test_get_balance_returns_zero_if_no_account_id()
    {
        $employee = Employee::factory()->create(['account_id' => null]);
        $this->assertEquals(0, $this->service->getBalance($employee));
    }

    public function test_get_balance_calculates_ledger_balance()
    {
        $account = ChartOfAccount::factory()->create();
        $employee = Employee::factory()->create(['account_id' => $account->id]);

        // Create random ledger entries
        GeneralLedger::factory()->create([
            'account_id' => $account->id,
            'amount' => 1000,
            'entry_type' => 'DEBIT'
        ]);
        GeneralLedger::factory()->create([
            'account_id' => $account->id,
            'amount' => 200,
            'entry_type' => 'CREDIT'
        ]);

        // Expected: 1000 - 200 = 800 (or vice versa depending on logic, but we fixed logic to calculate net)
        // If account type is Generic (random), logic:
        // if Asset/Expense: Debit - Credit.
        // if Liability/Revenue: Credit - Debit.
        // Factory creates generic account. Type is random.
        // Let's force account type to ensure test determinism.
        $account->update(['account_type' => 'Asset']); // Debit normal
        
        $this->assertEquals(800, $this->service->getBalance($employee));
    }

    public function test_record_transaction_creates_payroll_transaction()
    {
        $employee = Employee::factory()->create();
        
        $transaction = $this->service->recordTransaction(
            $employee,
            5000,
            'payment',
            now(),
            'Monthly Salary'
        );

        $this->assertInstanceOf(PayrollTransaction::class, $transaction);
        $this->assertEquals(5000, $transaction->amount);
        $this->assertEquals('payment', $transaction->transaction_type);
        $this->assertEquals($employee->id, $transaction->employee_id);
    }
}
