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
        $balance = GeneralLedger::where('account_id', $employee->account_id)
            ->sum(DB::raw('debit - credit'));
            
        // Depending on account type (Liability/Expense), balance might be Credit - Debit
        // For Payroll Payable (Liability), it should be Credit - Debit usually.
        // But let's assume standard Asset behavior or handle based on account type.
        // For simplicity, returning net movement for now.
        return $balance;
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
