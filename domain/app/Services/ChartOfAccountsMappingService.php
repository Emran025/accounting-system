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
            'sales_revenue' => $this->getAccountCode('Revenue', 'مبيعات') ?? $this->getAccountCode('Revenue', 'Sales') ?? '4100',
            'sales_discount' => $this->getAccountCode('Revenue', 'خصم المبيعات') ?? $this->getAccountCode('Revenue', 'Discount') ?? '4110',
            'other_revenue' => $this->getAccountCode('Revenue', 'إيرادات أخرى') ?? $this->getAccountCode('Revenue', 'Other') ?? '4200',
            'cost_of_goods_sold' => $this->getAccountCode('Expense', 'تكلفة البضاعة') ?? $this->getAccountCode('Expense', 'COGS') ?? '5100',
            'operating_expenses' => $this->getAccountCode('Expense', 'المصروفات التشغيلية') ?? $this->getAccountCode('Expense', 'Operating') ?? '5200',
            'depreciation_expense' => $this->getAccountCode('Expense', 'الإهلاك') ?? $this->getAccountCode('Expense', 'Depreciation') ?? '5300',
        ];
    }

    public function getAccountCode(string $accountType, ?string $namePattern = null): ?string
    {
        $query = \App\Models\ChartOfAccount::where('account_type', $accountType)
            ->where('is_active', true);

        if ($namePattern) {
            $query->where(function ($q) use ($namePattern) {
                $q->where('account_name', 'like', "%$namePattern%")
                  ->orWhere('account_code', 'like', "%$namePattern%");
            });
        }

        $account = $query->orderBy('account_code')->first();

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

