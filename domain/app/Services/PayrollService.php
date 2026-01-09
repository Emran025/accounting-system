<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\PayrollCycle;
use App\Models\PayrollItem;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Models\PayrollTransaction;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollService
{
    protected $accountService;

    public function __construct(EmployeeAccountService $accountService)
    {
        $this->accountService = $accountService;
    }

    public function generatePayroll($periodStart, $periodEnd, $user)
    {
        DB::beginTransaction();
        try {
            $cycle = PayrollCycle::create([
                'cycle_name' => "Payroll " . Carbon::parse($periodStart)->format('F Y'),
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'payment_date' => Carbon::parse($periodEnd)->addDays(1), // Default payment next day
                'status' => 'draft',
                'created_by' => $user->id
            ]);

            $employees = Employee::where('is_active', true)
                ->where('employment_status', 'active')
                ->where('hire_date', '<=', $periodEnd)
                ->get();

            $totalGross = 0;
            $totalDeductions = 0;
            $totalNet = 0;

            foreach ($employees as $employee) {
                $baseSalary = $employee->base_salary;
                
                // Calculate Allowances
                $allowances = $employee->allowances()->where('is_active', true)->sum('amount');
                
                // Calculate Deductions
                $deductions = $employee->deductions()->where('is_active', true)->sum('amount');

                $gross = $baseSalary + $allowances;
                $net = $gross - $deductions;

                PayrollItem::create([
                    'payroll_cycle_id' => $cycle->id,
                    'employee_id' => $employee->id,
                    'base_salary' => $baseSalary,
                    'total_allowances' => $allowances,
                    'total_deductions' => $deductions,
                    'gross_salary' => $gross,
                    'net_salary' => $net
                ]);

                $totalGross += $gross;
                $totalDeductions += $deductions;
                $totalNet += $net;
            }

            $cycle->update([
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
                'total_net' => $totalNet
            ]);

            DB::commit();
            return $cycle;

        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function approvePayroll($id, $user)
    {
        $cycle = PayrollCycle::findOrFail($id);
        if ($cycle->status !== 'draft') {
            throw new \Exception("Payroll cycle is not in draft status.");
        }

        DB::beginTransaction();
        try {
            $cycle->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now()
            ]);
            
            // Generate GL Entries: Accrue Salaries (Dr Expense, Cr Payable)
            $salaryExpenseAccount = ChartOfAccount::where('account_code', '5220')->first(); // Salaries Expense
            $salaryPayableAccount = ChartOfAccount::where('account_code', '2120')->first(); // Salaries Payable

            if (!$salaryExpenseAccount || !$salaryPayableAccount) {
                // If accounts don't exact match by code, try names or fallback? 
                // Creating critical dependency on seeders matches logic.
                // Assuming seeder ran correctly.
                throw new \Exception("Critical Payroll Accounts (5220 or 2120) missing in Schema.");
            }

            // Debit Salary Expense (Total Gross)
            GeneralLedger::create([
                'voucher_number' => 'PAY-ACCR-' . $cycle->id,
                'voucher_date' => now(), // Or period_end?
                'account_id' => $salaryExpenseAccount->id,
                'entry_type' => 'debit', // Asset/Expense increase = Debit? Logic typically: Debit
                'amount' => $cycle->total_gross,
                'description' => "Payroll Accrual: " . $cycle->cycle_name,
                'reference_type' => 'payroll_cycle',
                'reference_id' => $cycle->id,
                'created_by' => $user->id
            ]);

            // Credit Salaries Payable (Total Net) -> Assuming deducltions handled separately?
            // Simplified: Dr Expense (Gross), Cr Payable (Gross).
            // Then Payment: Dr Payable (Net), Cr Bank (Net), Dr Payable (Deduction), Cr Agency (Deduction).
            // OR: Dr Expense (Gross), Cr Payable (Net), Cr Deduction Liability (Deduction).
            
            // Let's go with: Dr Expense (Gross), Cr Payable (Net), Cr Other (Deductions if any)
            // But we don't have a Deduction Liability account easily mapped yet.
            // Let's assume Credit Payable = Gross for simplicity so far, OR split it if we can.
            // For checking "integrated with all accounting functions", proper double entry is key.
            
            // Let's Credit Salaries Payable with the NET amount for employees.
            GeneralLedger::create([
                'voucher_number' => 'PAY-ACCR-' . $cycle->id,
                'voucher_date' => now(),
                'account_id' => $salaryPayableAccount->id,
                'entry_type' => 'credit',
                'amount' => $cycle->total_net, // Accounts Payable to Employees
                'description' => "Payroll Payable: " . $cycle->cycle_name,
                'reference_type' => 'payroll_cycle',
                'reference_id' => $cycle->id,
                'created_by' => $user->id
            ]);

            // Handle Deductions discrepancy if any (Gross - Net)
            if ($cycle->total_deductions > 0) {
                 // Credit some liability account for deductions? E.g. Tax Payable?
                 // We'll map it to '2110' (Accounts Payable) as a placeholder for external agencies for now
                 // In real world, we'd need 'Social Security Payable', etc.
                 $apAccount = ChartOfAccount::where('account_code', '2110')->first();
                 if ($apAccount) {
                     GeneralLedger::create([
                        'voucher_number' => 'PAY-ACCR-' . $cycle->id,
                        'voucher_date' => now(),
                        'account_id' => $apAccount->id,
                        'entry_type' => 'credit',
                        'amount' => $cycle->total_deductions,
                        'description' => "Payroll Deductions Liability: " . $cycle->cycle_name,
                        'reference_type' => 'payroll_cycle',
                        'reference_id' => $cycle->id,
                        'created_by' => $user->id
                    ]);
                 }
            }

            DB::commit();
            return $cycle;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function processPayment($id)
    {
        $cycle = PayrollCycle::findOrFail($id);
        if ($cycle->status !== 'approved') {
            throw new \Exception("Payroll cycle must be approved before payment.");
        }

        DB::beginTransaction();
        try {
            $cycle->update(['status' => 'paid']);
            
            // Payment: Dr Salaries Payable (Net), Cr Cash/Bank
            $salaryPayableAccount = ChartOfAccount::where('account_code', '2120')->first();
            $cashAccount = ChartOfAccount::where('account_code', '1110')->first(); // Default Cash

            if ($salaryPayableAccount && $cashAccount) {
                 // Debit Payable
                 GeneralLedger::create([
                    'voucher_number' => 'PAY-PMT-' . $cycle->id,
                    'voucher_date' => now(),
                    'account_id' => $salaryPayableAccount->id,
                    'entry_type' => 'debit',
                    'amount' => $cycle->total_net,
                    'description' => "Payroll Payment: " . $cycle->cycle_name,
                    'reference_type' => 'payroll_cycle',
                    'reference_id' => $cycle->id,
                    'created_by' => auth()->id() ?? 1
                ]);

                // Credit Bank/Cash
                GeneralLedger::create([
                    'voucher_number' => 'PAY-PMT-' . $cycle->id,
                    'voucher_date' => now(),
                    'account_id' => $cashAccount->id,
                    'entry_type' => 'credit',
                    'amount' => $cycle->total_net,
                    'description' => "Payroll Payment: " . $cycle->cycle_name,
                    'reference_type' => 'payroll_cycle',
                    'reference_id' => $cycle->id,
                    'created_by' => auth()->id() ?? 1
                ]);
            }

            // Create Transaction Record for each employee for their history
            foreach($cycle->payrollItems as $item) {
                PayrollTransaction::create([
                    'payroll_cycle_id' => $cycle->id,
                    'employee_id' => $item->employee_id,
                    'amount' => $item->net_salary,
                    'transaction_type' => 'salary_payment',
                    'transaction_date' => now(),
                    'description' => "Salary Payment for cycle " . $cycle->cycle_name,
                    // 'gl_entry_id' => ... link if needed
                ]);
            }

            DB::commit();
            return $cycle;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
