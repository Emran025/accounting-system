<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $modules = [
            ['module_key' => 'dashboard', 'module_name_ar' => 'لوحة التحكم', 'module_name_en' => 'Dashboard', 'category' => 'system', 'icon' => 'home', 'sort_order' => 1],
            ['module_key' => 'sales', 'module_name_ar' => 'المبيعات', 'module_name_en' => 'Sales', 'category' => 'sales', 'icon' => 'cart', 'sort_order' => 10],
            ['module_key' => 'revenues', 'module_name_ar' => 'الإيرادات الإضافية', 'module_name_en' => 'Additional Revenues', 'category' => 'sales', 'icon' => 'plus', 'sort_order' => 11],
            ['module_key' => 'deferred_sales', 'module_name_ar' => 'المبيعات الآجلة', 'module_name_en' => 'Deferred Sales', 'category' => 'sales', 'icon' => 'dollar', 'sort_order' => 12],
            ['module_key' => 'products', 'module_name_ar' => 'المنتجات', 'module_name_en' => 'Products', 'category' => 'inventory', 'icon' => 'box', 'sort_order' => 20],
            ['module_key' => 'purchases', 'module_name_ar' => 'المشتريات', 'module_name_en' => 'Purchases', 'category' => 'purchases', 'icon' => 'download', 'sort_order' => 30],
            ['module_key' => 'expenses', 'module_name_ar' => 'المصروفات', 'module_name_en' => 'Expenses', 'category' => 'purchases', 'icon' => 'dollar', 'sort_order' => 31],
            ['module_key' => 'ar_customers', 'module_name_ar' => 'العملاء والديون', 'module_name_en' => 'AR Customers', 'category' => 'people', 'icon' => 'users', 'sort_order' => 40],
            ['module_key' => 'ap_suppliers', 'module_name_ar' => 'الموردين', 'module_name_en' => 'AP Suppliers', 'category' => 'people', 'icon' => 'users', 'sort_order' => 41],
            ['module_key' => 'chart_of_accounts', 'module_name_ar' => 'دليل الحسابات', 'module_name_en' => 'Chart of Accounts', 'category' => 'finance', 'icon' => 'box', 'sort_order' => 50],
            ['module_key' => 'general_ledger', 'module_name_ar' => 'دفتر الأستاذ العام', 'module_name_en' => 'General Ledger', 'category' => 'finance', 'icon' => 'dollar', 'sort_order' => 51],
            ['module_key' => 'journal_vouchers', 'module_name_ar' => 'سندات القيد', 'module_name_en' => 'Journal Vouchers', 'category' => 'finance', 'icon' => 'edit', 'sort_order' => 52],
            ['module_key' => 'fiscal_periods', 'module_name_ar' => 'الفترات المالية', 'module_name_en' => 'Fiscal Periods', 'category' => 'finance', 'icon' => 'dollar', 'sort_order' => 53],
            ['module_key' => 'accrual_accounting', 'module_name_ar' => 'المحاسبة الاستحقاقية', 'module_name_en' => 'Accrual Accounting', 'category' => 'finance', 'icon' => 'dollar', 'sort_order' => 54],
            ['module_key' => 'reconciliation', 'module_name_ar' => 'التسوية البنكية', 'module_name_en' => 'Bank Reconciliation', 'category' => 'finance', 'icon' => 'check', 'sort_order' => 55],
            ['module_key' => 'assets', 'module_name_ar' => 'الأصول', 'module_name_en' => 'Fixed Assets', 'category' => 'finance', 'icon' => 'building', 'sort_order' => 56],
            ['module_key' => 'reports', 'module_name_ar' => 'الميزانية والتقارير', 'module_name_en' => 'Reports & Balance Sheet', 'category' => 'reports', 'icon' => 'eye', 'sort_order' => 60],
            ['module_key' => 'audit_trail', 'module_name_ar' => 'سجل التدقيق', 'module_name_en' => 'Audit Trail', 'category' => 'system', 'icon' => 'eye', 'sort_order' => 70],
            ['module_key' => 'recurring_transactions', 'module_name_ar' => 'المعاملات المتكررة', 'module_name_en' => 'Recurring Transactions', 'category' => 'system', 'icon' => 'check', 'sort_order' => 71],
            ['module_key' => 'batch_processing', 'module_name_ar' => 'المعالجة الدفعية', 'module_name_en' => 'Batch Processing', 'category' => 'system', 'icon' => 'check', 'sort_order' => 72],
            ['module_key' => 'users', 'module_name_ar' => 'إدارة المستخدمين', 'module_name_en' => 'User Management', 'category' => 'system', 'icon' => 'users', 'sort_order' => 73],
            ['module_key' => 'settings', 'module_name_ar' => 'الإعدادات', 'module_name_en' => 'Settings', 'category' => 'system', 'icon' => 'settings', 'sort_order' => 74],
            ['module_key' => 'roles_permissions', 'module_name_ar' => 'الأدوار والصلاحيات', 'module_name_en' => 'Roles & Permissions', 'category' => 'system', 'icon' => 'lock', 'sort_order' => 75],
        ];

        foreach ($modules as $module) {
            Module::updateOrCreate(
                ['module_key' => $module['module_key']],
                $module
            );
        }
    }
}
