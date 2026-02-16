<?php

namespace Database\Seeders;

use App\Models\PermissionTemplate;
use Illuminate\Database\Seeder;

class PermissionTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'template_name' => 'موظف أساسي',
                'template_key' => 'basic_employee',
                'description' => 'صلاحيات أساسية للموظف العادي - عرض فقط',
                'permissions' => json_encode([
                    ['module_key' => 'portal', 'can_view' => true, 'can_create' => false, 'can_edit' => false, 'can_delete' => false],
                    ['module_key' => 'leave', 'can_view' => true, 'can_create' => true, 'can_edit' => false, 'can_delete' => false],
                    ['module_key' => 'attendance', 'can_view' => true, 'can_create' => false, 'can_edit' => false, 'can_delete' => false],
                ]),
                'is_active' => true,
            ],
            [
                'template_name' => 'موظف موثوق',
                'template_key' => 'trusted_employee',
                'description' => 'صلاحيات موسعة للموظفين الموثوقين - عرض وإنشاء',
                'permissions' => json_encode([
                    ['module_key' => 'portal', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'leave', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'attendance', 'can_view' => true, 'can_create' => true, 'can_edit' => false, 'can_delete' => false],
                    ['module_key' => 'travel', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'loans', 'can_view' => true, 'can_create' => true, 'can_edit' => false, 'can_delete' => false],
                    ['module_key' => 'knowledge', 'can_view' => true, 'can_create' => true, 'can_edit' => false, 'can_delete' => false],
                ]),
                'is_active' => true,
            ],
            [
                'template_name' => 'مدير قسم',
                'template_key' => 'department_manager',
                'description' => 'صلاحيات كاملة لمدير القسم على وحدات الموارد البشرية',
                'permissions' => json_encode([
                    ['module_key' => 'employees', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'attendance', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'leave', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'performance', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'recruitment', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'portal', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'travel', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'loans', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'relations', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'learning', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                    ['module_key' => 'knowledge', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'communications', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => false],
                ]),
                'is_active' => true,
            ],
            [
                'template_name' => 'مسؤول الموارد البشرية',
                'template_key' => 'hr_admin',
                'description' => 'صلاحيات كاملة على جميع وحدات الموارد البشرية',
                'permissions' => json_encode([
                    ['module_key' => 'employees', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'attendance', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'leave', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'payroll', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'eosb', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'recruitment', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'onboarding', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'performance', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'learning', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'succession', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'compensation', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'benefits', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'portal', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'travel', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'loans', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'relations', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'communications', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'compliance', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'ehs', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'wellness', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'knowledge', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'expertise', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'contingent', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'scheduling', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                ]),
                'is_active' => true,
            ],
            [
                'template_name' => 'مسؤول مالي',
                'template_key' => 'finance_admin',
                'description' => 'صلاحيات كاملة على الوحدات المالية والمحاسبية',
                'permissions' => json_encode([
                    ['module_key' => 'chart_of_accounts', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'general_ledger', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'journal_vouchers', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'fiscal_periods', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'accrual_accounting', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'reconciliation', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'assets', 'can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true],
                    ['module_key' => 'payroll', 'can_view' => true, 'can_create' => false, 'can_edit' => false, 'can_delete' => false],
                ]),
                'is_active' => true,
            ],
        ];

        foreach ($templates as $template) {
            PermissionTemplate::updateOrCreate(
                ['template_key' => $template['template_key']],
                $template
            );
        }
    }
}
