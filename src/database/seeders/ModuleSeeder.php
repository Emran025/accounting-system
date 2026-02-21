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
            ['module_key' => 'returns', 'module_name_ar' => 'مرتجعات المبيعات', 'module_name_en' => 'Sales Returns', 'category' => 'sales', 'icon' => 'history', 'sort_order' => 13],
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
            ['module_key' => 'currency', 'module_name_ar' => 'العملات والسياسة النقدية', 'module_name_en' => 'Currency & Finance Policy', 'category' => 'finance', 'icon' => 'coins', 'sort_order' => 57],
            ['module_key' => 'vat_zatca', 'module_name_ar' => 'الضرائب والزكاة (VAT/ZATCA)', 'module_name_en' => 'VAT & ZATCA Management', 'category' => 'finance', 'icon' => 'shield-check', 'sort_order' => 58],
            ['module_key' => 'reports', 'module_name_ar' => 'الميزانية والتقارير', 'module_name_en' => 'Reports & Balance Sheet', 'category' => 'reports', 'icon' => 'eye', 'sort_order' => 60],
            ['module_key' => 'audit_trail', 'module_name_ar' => 'سجل التدقيق', 'module_name_en' => 'Audit Trail', 'category' => 'system', 'icon' => 'eye', 'sort_order' => 70],
            ['module_key' => 'recurring_transactions', 'module_name_ar' => 'المعاملات المتكررة', 'module_name_en' => 'Recurring Transactions', 'category' => 'system', 'icon' => 'check', 'sort_order' => 71],
            ['module_key' => 'batch_processing', 'module_name_ar' => 'المعالجة الدفعية', 'module_name_en' => 'Batch Processing', 'category' => 'system', 'icon' => 'check', 'sort_order' => 72],
            ['module_key' => 'users', 'module_name_ar' => 'إدارة المستخدمين', 'module_name_en' => 'User Management', 'category' => 'system', 'icon' => 'users', 'sort_order' => 73],
            ['module_key' => 'settings', 'module_name_ar' => 'الإعدادات', 'module_name_en' => 'Settings', 'category' => 'system', 'icon' => 'settings', 'sort_order' => 74],
            ['module_key' => 'system_templates', 'module_name_ar' => 'إدارة القوالب', 'module_name_en' => 'Template Management', 'category' => 'system', 'icon' => 'file-signature', 'sort_order' => 76],
            ['module_key' => 'roles_permissions', 'module_name_ar' => 'الأدوار والصلاحيات', 'module_name_en' => 'Roles & Permissions', 'category' => 'system', 'icon' => 'lock', 'sort_order' => 75],
            ['module_key' => 'hr', 'module_name_ar' => 'الموارد البشرية', 'module_name_en' => 'Human Resources', 'category' => 'hr', 'icon' => 'users', 'sort_order' => 80],
            ['module_key' => 'employees', 'module_name_ar' => 'إدارة الموظفين', 'module_name_en' => 'Employee Management', 'category' => 'hr', 'icon' => 'user-tie', 'sort_order' => 81],
            ['module_key' => 'recruitment', 'module_name_ar' => 'التوظيف والمرشحين', 'module_name_en' => 'Recruitment & Candidates', 'category' => 'hr', 'icon' => 'user-plus', 'sort_order' => 82],
            ['module_key' => 'onboarding', 'module_name_ar' => 'التوظيف والإنهاء', 'module_name_en' => 'Onboarding & Termination', 'category' => 'hr', 'icon' => 'user-check', 'sort_order' => 83],
            ['module_key' => 'contingent', 'module_name_ar' => 'العمالة المؤقتة', 'module_name_en' => 'Contingent Workers', 'category' => 'hr', 'icon' => 'briefcase', 'sort_order' => 84],
            ['module_key' => 'compliance', 'module_name_ar' => 'الجودة والامتثال', 'module_name_en' => 'QA & Compliance', 'category' => 'hr', 'icon' => 'shield-check', 'sort_order' => 85],
            ['module_key' => 'attendance', 'module_name_ar' => 'الحضور والانصراف', 'module_name_en' => 'Attendance & Clocking', 'category' => 'hr', 'icon' => 'clock', 'sort_order' => 86],
            ['module_key' => 'scheduling', 'module_name_ar' => 'جدولة القوى العاملة', 'module_name_en' => 'Workforce Scheduling', 'category' => 'hr', 'icon' => 'calendar-days', 'sort_order' => 87],
            ['module_key' => 'leave', 'module_name_ar' => 'الإجازات', 'module_name_en' => 'Leave Management', 'category' => 'hr', 'icon' => 'calendar', 'sort_order' => 88],
            ['module_key' => 'relations', 'module_name_ar' => 'علاقات الموظفين', 'module_name_en' => 'Employee Relations', 'category' => 'hr', 'icon' => 'scale', 'sort_order' => 89],
            ['module_key' => 'travel', 'module_name_ar' => 'السفر والمصروفات', 'module_name_en' => 'Travel & Expenses', 'category' => 'hr', 'icon' => 'plane', 'sort_order' => 90],
            ['module_key' => 'loans', 'module_name_ar' => 'القروض المالية', 'module_name_en' => 'Financial Loans', 'category' => 'hr', 'icon' => 'hand-holding-usd', 'sort_order' => 91],
            ['module_key' => 'communications', 'module_name_ar' => 'الاتصالات المؤسسية', 'module_name_en' => 'Corporate Communications', 'category' => 'hr', 'icon' => 'bullhorn', 'sort_order' => 92],
            ['module_key' => 'performance', 'module_name_ar' => 'الأداء والأهداف', 'module_name_en' => 'Performance & Goals', 'category' => 'hr', 'icon' => 'chart-line', 'sort_order' => 93],
            ['module_key' => 'learning', 'module_name_ar' => 'التدريب والتعلم', 'module_name_en' => 'Training & Learning (LMS)', 'category' => 'hr', 'icon' => 'graduation-cap', 'sort_order' => 94],
            ['module_key' => 'succession', 'module_name_ar' => 'التخطيط للخلافة', 'module_name_en' => 'Succession Planning', 'category' => 'hr', 'icon' => 'sitemap', 'sort_order' => 95],
            ['module_key' => 'compensation', 'module_name_ar' => 'إدارة التعويضات', 'module_name_en' => 'Compensation Management', 'category' => 'hr', 'icon' => 'money-bill-wave', 'sort_order' => 96],
            ['module_key' => 'benefits', 'module_name_ar' => 'المزايا والاستحقاقات', 'module_name_en' => 'Benefits & Entitlements', 'category' => 'hr', 'icon' => 'heart', 'sort_order' => 97],
            ['module_key' => 'payroll', 'module_name_ar' => 'الرواتب', 'module_name_en' => 'Payroll', 'category' => 'hr', 'icon' => 'money', 'sort_order' => 98],
            ['module_key' => 'ehs', 'module_name_ar' => 'الصحة والسلامة', 'module_name_en' => 'Health & Safety (EHS)', 'category' => 'hr', 'icon' => 'hard-hat', 'sort_order' => 99],
            ['module_key' => 'wellness', 'module_name_ar' => 'الرفاهية', 'module_name_en' => 'Wellness', 'category' => 'hr', 'icon' => 'heart-pulse', 'sort_order' => 100],
            ['module_key' => 'knowledge', 'module_name_ar' => 'قاعدة المعرفة', 'module_name_en' => 'Knowledge Base', 'category' => 'hr', 'icon' => 'book', 'sort_order' => 101],
            ['module_key' => 'expertise', 'module_name_ar' => 'دليل الخبراء', 'module_name_en' => 'Expertise Directory', 'category' => 'hr', 'icon' => 'users-gear', 'sort_order' => 102],
            ['module_key' => 'portal', 'module_name_ar' => 'البوابة الذاتية', 'module_name_en' => 'Employee Self-Service Portal', 'category' => 'hr', 'icon' => 'user-cog', 'sort_order' => 103],
            ['module_key' => 'eosb', 'module_name_ar' => 'مكافأة نهاية الخدمة', 'module_name_en' => 'End of Service Benefits (EOSB)', 'category' => 'hr', 'icon' => 'calculator', 'sort_order' => 104],
            ['module_key' => 'expat_management', 'module_name_ar' => 'إدارة المغتربين', 'module_name_en' => 'Expat Management', 'category' => 'hr', 'icon' => 'globe', 'sort_order' => 105],
        ];

        foreach ($modules as $module) {
            Module::updateOrCreate(
                ['module_key' => $module['module_key']],
                $module
            );
        }
    }
}
