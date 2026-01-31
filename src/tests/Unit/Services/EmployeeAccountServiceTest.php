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
        GeneralLedger::factory()->create(['account_id' => $account->id, 'debit' => 1000, 'credit' => 0]);
        GeneralLedger::factory()->create(['account_id' => $account->id, 'debit' => 0, 'credit' => 200]);

        // Expected: 1000 - 200 = 800
        $this->assertEquals(800, $this->service->getBalance($employee));
    }

    public function test_record_transaction_creates_payroll_transaction()
    {
        $employee = Employee::factory()->create();
        
        $transaction = $this->service->recordTransaction(
            $employee,
            5000,
            'salary',
            now(),
            'Monthly Salary'
        );

        $this->assertInstanceOf(PayrollTransaction::class, $transaction);
        $this->assertEquals(5000, $transaction->amount);
        $this->assertEquals('salary', $transaction->transaction_type);
        $this->assertEquals($employee->id, $transaction->employee_id);
    }
}
