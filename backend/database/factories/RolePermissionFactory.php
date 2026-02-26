<?php

namespace Database\Factories;

use App\Models\RolePermission;
use App\Models\Role;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class RolePermissionFactory extends Factory
{
    protected $model = RolePermission::class;

    public function definition()
    {
        return [
            'role_id' => Role::factory(),
            'module_id' => Module::factory(),
            'can_view' => true,
            'can_create' => false,
            'can_edit' => false,
            'can_delete' => false,
        ];
    }
}
