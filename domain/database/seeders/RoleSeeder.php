<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['role_key' => 'admin', 'role_name_ar' => 'مدير النظام', 'role_name_en' => 'System Administrator', 'description' => 'Full system access with all permissions', 'is_system' => true],
            ['role_key' => 'manager', 'role_name_ar' => 'مدير', 'role_name_en' => 'Manager', 'description' => 'Business manager with most operational permissions', 'is_system' => true],
            ['role_key' => 'accountant', 'role_name_ar' => 'محاسب', 'role_name_en' => 'Accountant', 'description' => 'Financial operations and reporting', 'is_system' => true],
            ['role_key' => 'cashier', 'role_name_ar' => 'كاشير', 'role_name_en' => 'Cashier', 'description' => 'Point-of-sale operations only', 'is_system' => true],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['role_key' => $role['role_key']],
                $role
            );
        }
    }
}
