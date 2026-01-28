<?php

namespace App\Services;

class ChartOfAccountsMappingService
{
    public function getStandardAccounts(): array
    {
        return [
            'cash' => $this->getAccountCode('Asset', 'النقدية') ?? $this->getAccountCode('Asset', 'Cash') ?? '1110',
            'accounts_receivable' => $this->getAccountCode('Asset', 'الذمم المدينة') ?? $this->getAccountCode('Asset', 'Receivable') ?? '1120',
            'inventory' => $this->getAccountCode('Asset', 'المخزون') ?? $this->getAccountCode('Asset', 'Inventory') ?? '1130',
            'fixed_assets' => $this->getAccountCode('Asset', 'المعدات') ?? $this->getAccountCode('Asset', 'Fixed') ?? '1210',
            'accounts_payable' => $this->getAccountCode('Liability', 'الذمم الدائنة') ?? $this->getAccountCode('Liability', 'Payable') ?? '2110',
            'output_vat' => $this->getAccountCode('Liability', 'مخرجات') ?? $this->getAccountCode('Liability', 'Output') ?? '2210',
            'input_vat' => $this->getAccountCode('Liability', 'مدخلات') ?? $this->getAccountCode('Liability', 'Input') ?? '2220',
            'capital' => $this->getAccountCode('Equity', 'رأس المال') ?? $this->getAccountCode('Equity', 'Capital') ?? '3100',
            'retained_earnings' => $this->getAccountCode('Equity', 'الأرباح المحتجزة') ?? $this->getAccountCode('Equity', 'Retained') ?? '3200',
            'sales_revenue' => $this->getAccountCode('Revenue', '4101') ?? $this->getAccountCode('Revenue', 'مبيعات') ?? '4100',
            'sales_discount' => $this->getAccountCode('Revenue', 'خصم المبيعات') ?? $this->getAccountCode('Revenue', 'Discount') ?? '4110',
            'other_revenue' => $this->getAccountCode('Revenue', 'إيرادات أخرى') ?? $this->getAccountCode('Revenue', 'Other') ?? '4200',
            'cost_of_goods_sold' => $this->getAccountCode('Expense', 'تكلفة البضاعة') ?? $this->getAccountCode('Expense', 'COGS') ?? '5100',
            'operating_expenses' => $this->getAccountCode('Expense', 'مصروفات متنوعة') ?? $this->getAccountCode('Expense', 'Operating') ?? $this->getAccountCode('Expense', '5290') ?? $this->getAccountCode('Expense', '5210') ?? '5210',
            'salaries_expense' => $this->getAccountCode('Expense', 'مرتبات') ?? $this->getAccountCode('Expense', 'Salary') ?? '5220',
            'salaries_payable' => $this->getAccountCode('Liability', 'رواتب مستحقة') ?? $this->getAccountCode('Liability', 'Salary Payable') ?? '2120',
            'depreciation_expense' => $this->getAccountCode('Expense', 'الإهلاك') ?? $this->getAccountCode('Expense', 'Depreciation') ?? '5300',
        ];  
    }

    public function getAccountCode(string $accountType, ?string $namePattern = null): ?string
    {
        $query = \App\Models\ChartOfAccount::where('account_type', $accountType)
            ->where('is_active', true);

        // Preference: Accounts that are NOT parents (no children)
        // We check for absence of children by looking for accounts whose ID is not a parent_id
        $query->whereNotExists(function ($q) {
            $q->select(\DB::raw(1))
              ->from('chart_of_accounts as children')
              ->whereColumn('children.parent_id', 'chart_of_accounts.id');
        });

        if ($namePattern) {
            $query->where(function ($q) use ($namePattern) {
                $q->where('account_name', 'like', "%$namePattern%")
                  ->orWhere('account_code', 'like', "%$namePattern%");
            });
        }

        $account = $query->orderBy('account_code')->first();

        // If no leaf account found, try searching with name pattern but still strictly leaf only
        if (!$account && $namePattern) {
            $account = \App\Models\ChartOfAccount::where('account_type', $accountType)
                ->where('is_active', true)
                ->where(function ($q) use ($namePattern) {
                    $q->where('account_name', 'like', "%$namePattern%")
                      ->orWhere('account_code', 'like', "%$namePattern%");
                })
                ->whereNotExists(function ($q) {
                    $q->select(\DB::raw(1))
                      ->from('chart_of_accounts as children')
                      ->whereColumn('children.parent_id', 'chart_of_accounts.id');
                })
                ->orderBy('account_code')
                ->first();
        }

        return $account?->account_code;
    }

    public function validateAccountCode(string $accountCode): ?string
    {
        $account = \App\Models\ChartOfAccount::where('account_code', $accountCode)
            ->where('is_active', true)
            ->first();

        return $account?->account_code;
    }
}

