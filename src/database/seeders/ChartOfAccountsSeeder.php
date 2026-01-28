<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChartOfAccount;

class ChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Force seeding by removing existing if needed or just allowed to run
        // ChartOfAccount::truncate(); // Uncomment if you want to clear first

        $accounts = [
            // Assets
            ['account_code' => '1000', 'account_name' => 'الأصول', 'account_type' => 'Asset'],
            ['account_code' => '1100', 'account_name' => 'الأصول المتداولة', 'account_type' => 'Asset'],
            ['account_code' => '1110', 'account_name' => 'النقدية', 'account_type' => 'Asset'],
            ['account_code' => '1120', 'account_name' => 'الذمم المدينة', 'account_type' => 'Asset'],
            ['account_code' => '1130', 'account_name' => 'المخزون', 'account_type' => 'Asset'],
            ['account_code' => '1200', 'account_name' => 'الأصول الثابتة', 'account_type' => 'Asset'],
            ['account_code' => '1210', 'account_name' => 'المعدات', 'account_type' => 'Asset'],
            ['account_code' => '1220', 'account_name' => 'مخصص الإهلاك', 'account_type' => 'Asset'],

            // Liabilities
            ['account_code' => '2000', 'account_name' => 'الخصوم', 'account_type' => 'Liability'],
            ['account_code' => '2100', 'account_name' => 'الخصوم المتداولة', 'account_type' => 'Liability'],
            ['account_code' => '2110', 'account_name' => 'الذمم الدائنة', 'account_type' => 'Liability'],
            ['account_code' => '2120', 'account_name' => 'رواتب مستحقة', 'account_type' => 'Liability'],
            ['account_code' => '2200', 'account_name' => 'ضريبة القيمة المضافة', 'account_type' => 'Liability'],
            ['account_code' => '2210', 'account_name' => 'ضريبة القيمة المضافة - مخرجات', 'account_type' => 'Liability'],
            ['account_code' => '2220', 'account_name' => 'ضريبة القيمة المضافة - مدخلات', 'account_type' => 'Liability'],

            // Equity
            ['account_code' => '3000', 'account_name' => 'حقوق الملكية', 'account_type' => 'Equity'],
            ['account_code' => '3100', 'account_name' => 'رأس المال', 'account_type' => 'Equity'],
            ['account_code' => '3200', 'account_name' => 'الأرباح المحتجزة', 'account_type' => 'Equity'],

            // Revenue
            ['account_code' => '4000', 'account_name' => 'الإيرادات', 'account_type' => 'Revenue'],
            ['account_code' => '4100', 'account_name' => 'مجموعة المبيعات', 'account_type' => 'Revenue'],
            ['account_code' => '4101', 'account_name' => 'مبيعات', 'account_type' => 'Revenue'],
            ['account_code' => '4110', 'account_name' => 'خصم المبيعات', 'account_type' => 'Revenue'],
            ['account_code' => '4200', 'account_name' => 'مجموعة الإيرادات الأخرى', 'account_type' => 'Revenue'],
            ['account_code' => '4210', 'account_name' => 'إيرادات أخرى', 'account_type' => 'Revenue'],            
            // Expenses
            ['account_code' => '5000', 'account_name' => 'المصروفات', 'account_type' => 'Expense'],
            ['account_code' => '5100', 'account_name' => 'مجموعة تكلفة البضاعة المباعة', 'account_type' => 'Expense'],
            ['account_code' => '5101', 'account_name' => 'تكلفة البضاعة المباعة', 'account_type' => 'Expense'],
            ['account_code' => '5200', 'account_name' => 'المصروفات التشغيلية', 'account_type' => 'Expense'],
            ['account_code' => '5210', 'account_name' => 'إيجار', 'account_type' => 'Expense'],
            ['account_code' => '5220', 'account_name' => 'مرتبات', 'account_type' => 'Expense'],
            ['account_code' => '5230', 'account_name' => 'مرافق', 'account_type' => 'Expense'],
            ['account_code' => '5240', 'account_name' => 'مصروفات تشغيلية أخرى', 'account_type' => 'Expense'],
            ['account_code' => '5290', 'account_name' => 'مصروفات متنوعة', 'account_type' => 'Expense'],
            ['account_code' => '5300', 'account_name' => 'مصروف الإهلاك', 'account_type' => 'Expense'],
        ];

        $accountMap = [];
        foreach ($accounts as $account) {
            $created = ChartOfAccount::updateOrCreate(
                ['account_code' => $account['account_code']],
                [
                    'account_name' => $account['account_name'],
                    'account_type' => $account['account_type'],
                ]
            );
            $accountMap[$account['account_code']] = $created->id;
        }

        // Set parent relationships
        $parentRelationships = [
            '1100' => '1000',
            '1110' => '1100',
            '1120' => '1100',
            '1130' => '1100',
            '1200' => '1000',
            '1210' => '1200',
            '1220' => '1200',
            '2100' => '2000',
            '2110' => '2100',
            '2120' => '2100',
            '2200' => '2000',
            '2210' => '2200',
            '2220' => '2200',
            '3100' => '3000',
            '3200' => '3000',
            '4100' => '4000',
            '4101' => '4100',
            '4110' => '4100',
            '4200' => '4000',
            '5100' => '5000',
            '5200' => '5000',
            '5210' => '5200',
            '5220' => '5200',
            '5230' => '5200',
            '5240' => '5200',
            '5290' => '5200',
            '5300' => '5000',
        ];

        foreach ($parentRelationships as $childCode => $parentCode) {
            if (isset($accountMap[$childCode]) && isset($accountMap[$parentCode])) {
                ChartOfAccount::where('id', $accountMap[$childCode])
                    ->update(['parent_id' => $accountMap[$parentCode]]);
            }
        }
    }
}
