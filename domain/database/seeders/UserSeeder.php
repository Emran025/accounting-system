<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        if (User::count() > 0) {
            return; // Already seeded
        }

        // Get admin role
        $adminRole = Role::where('role_key', 'admin')->first();

        User::create([
            'username' => 'admin',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
            'role_id' => $adminRole?->id,
            'is_active' => true,
        ]);
    }
}
