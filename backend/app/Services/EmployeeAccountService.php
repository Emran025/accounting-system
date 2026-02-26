<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\PayrollTransaction;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use Illuminate\Support\Facades\DB;

class EmployeeAccountService
{
    /**
     * Get employee account balance
     */
    public function getBalance(Employee $employee)
    {
        // Calculate balance from GL entries linked to the employee's account
        // Assuming employee has a specific account_id in Chart of Accounts
        if (!$employee->account_id) {
            return 0;
        }

        // Logic to sum debits and credits from General Ledger for this account
        // Account for DEBIT and CREDIT entry types as explicitly separate values
        $result = GeneralLedger::where('account_id', $employee->account_id)
            ->selectRaw("SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debit")
            ->selectRaw("SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credit")
            ->first();

        $totalDebit = $result->total_debit ?? 0;
        $totalCredit = $result->total_credit ?? 0;

        // Typically, employee accounts are Liabilities (Payables) -> Credit Balance is positive
        // So Credit - Debit
        // If it's an Expense/Asset, it would be Debit - Credit.
        // Let's check account type if possible, or default to Credit-Debit for payables.
        $account = ChartOfAccount::find($employee->account_id);
        if ($account && in_array($account->account_type, ['Asset', 'Expense'])) {
             return $totalDebit - $totalCredit;
        }

        return $totalCredit - $totalDebit;
    }

    /**
     * Record a transaction for an employee
     */
    public function recordTransaction(Employee $employee, $amount, $type, $date, $description, $relatedGlEntryId = null, $cycleId = null)
    {
        return PayrollTransaction::create([
            'employee_id' => $employee->id,
            'payroll_cycle_id' => $cycleId,
            'gl_entry_id' => $relatedGlEntryId,
            'amount' => $amount,
            'transaction_type' => $type,
            'transaction_date' => $date,
            'description' => $description
        ]);
    }
}
