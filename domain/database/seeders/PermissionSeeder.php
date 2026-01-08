<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Module;
use App\Models\RolePermission;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Admin: Full access to all modules
        $admin = Role::where('role_key', 'admin')->first();
        if ($admin) {
            Module::all()->each(function ($module) use ($admin) {
                RolePermission::updateOrCreate(
                    ['role_id' => $admin->id, 'module_id' => $module->id],
                    ['can_view' => true, 'can_create' => true, 'can_edit' => true, 'can_delete' => true]
                );
            });
        }

        // Manager permissions
        $manager = Role::where('role_key', 'manager')->first();
        if ($manager) {
            Module::whereNotIn('module_key', ['settings', 'batch_processing', 'roles_permissions'])->each(function ($module) use ($manager) {
                $canCreate = !in_array($module->module_key, ['fiscal_periods', 'general_ledger', 'reports', 'audit_trail']);
                $canEdit = !in_array($module->module_key, ['fiscal_periods', 'general_ledger', 'reports', 'audit_trail', 'journal_vouchers', 'users', 'settings', 'roles_permissions']);
                $canDelete = in_array($module->module_key, ['revenues', 'expenses']);

                RolePermission::updateOrCreate(
                    ['role_id' => $manager->id, 'module_id' => $module->id],
                    [
                        'can_view' => true,
                        'can_create' => $canCreate,
                        'can_edit' => $canEdit,
                        'can_delete' => $canDelete,
                    ]
                );
            });
        }

        // Accountant permissions
        $accountant = Role::where('role_key', 'accountant')->first();
        if ($accountant) {
            Module::whereNotIn('module_key', ['users', 'settings', 'batch_processing', 'roles_permissions'])->each(function ($module) use ($accountant) {
                $canCreate = !in_array($module->module_key, ['products', 'fiscal_periods', 'general_ledger', 'reports', 'audit_trail', 'recurring_transactions']);
                $canEdit = !in_array($module->module_key, ['sales', 'products', 'purchases', 'fiscal_periods', 'general_ledger', 'journal_vouchers', 'reports', 'audit_trail', 'recurring_transactions']);

                RolePermission::updateOrCreate(
                    ['role_id' => $accountant->id, 'module_id' => $module->id],
                    [
                        'can_view' => true,
                        'can_create' => $canCreate,
                        'can_edit' => $canEdit,
                        'can_delete' => false,
                    ]
                );
            });
        }

        // Cashier permissions
        $cashier = Role::where('role_key', 'cashier')->first();
        if ($cashier) {
            Module::whereIn('module_key', ['dashboard', 'sales', 'products', 'ar_customers'])->each(function ($module) use ($cashier) {
                RolePermission::updateOrCreate(
                    ['role_id' => $cashier->id, 'module_id' => $module->id],
                    [
                        'can_view' => true,
                        'can_create' => $module->module_key === 'sales',
                        'can_edit' => false,
                        'can_delete' => false,
                    ]
                );
            });
        }
    }
}
