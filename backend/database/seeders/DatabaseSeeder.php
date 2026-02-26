<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            ModuleSeeder::class,
            PermissionSeeder::class,
            ChartOfAccountsSeeder::class,
            SettingsSeeder::class,
            OrgStructureSeeder::class,
            DocumentSequenceSeeder::class,
            UserSeeder::class,
            CategorySeeder::class,
            ProductSeeder::class,
            CurrencySeeder::class,
            CurrencyPolicySeeder::class,
        ]);
    }
}
