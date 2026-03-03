<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Role;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RolesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_roles()
    {
        $response = $this->authGet(route('api.roles.index'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'roles']);
    }

    public function test_can_list_roles_with_action_roles()
    {
        $response = $this->authGet(route('api.roles.index') . '?action=roles');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_can_list_modules()
    {
        Module::create([
            'module_key' => 'sales',
            'module_name_ar' => 'المبيعات',
            'module_name_en' => 'Sales',
            'category' => 'Finance',
            'sort_order' => 1,
        ]);

        $response = $this->authGet(route('api.roles.index') . '?action=modules');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_can_create_role()
    {
        $data = [
            'name' => 'Custom Manager',
            'description' => 'A custom manager role',
        ];

        $response = $this->authPost(route('api.roles.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('roles', ['role_key' => 'custom-manager']);
    }

    public function test_can_delete_non_system_role()
    {
        $role = Role::create([
            'role_key' => 'temp-role',
            'role_name_en' => 'Temp',
            'role_name_ar' => 'مؤقت',
            'is_system' => false,
            'is_active' => true,
        ]);

        $response = $this->authDelete(route('api.roles.destroy', ['id' => $role->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_cannot_delete_system_role()
    {
        $role = Role::create([
            'role_key' => 'system-role',
            'role_name_en' => 'System',
            'role_name_ar' => 'نظام',
            'is_system' => true,
            'is_active' => true,
        ]);

        $response = $this->authDelete(route('api.roles.destroy', ['id' => $role->id]));

        $this->assertErrorResponse($response, 403);
        $this->assertDatabaseHas('roles', ['id' => $role->id]);
    }

    public function test_cannot_delete_role_with_assigned_users()
    {
        $role = Role::create([
            'role_key' => 'used-role',
            'role_name_en' => 'Used',
            'role_name_ar' => 'مستخدم',
            'is_system' => false,
            'is_active' => true,
        ]);

        User::factory()->create(['role_id' => $role->id]);

        $response = $this->authDelete(route('api.roles.destroy', ['id' => $role->id]));

        $this->assertErrorResponse($response, 422);
    }

    public function test_can_update_role_permissions()
    {
        $role = Role::create([
            'role_key' => 'perms-role',
            'role_name_en' => 'Perms',
            'role_name_ar' => 'صلاحيات',
            'is_system' => false,
            'is_active' => true,
        ]);

        $module = Module::create([
            'module_key' => 'test_module',
            'module_name_ar' => 'اختبار',
            'module_name_en' => 'Test Module',
            'category' => 'System',
            'sort_order' => 1,
        ]);

        $data = [
            'role_id' => $role->id,
            'permissions' => [
                [
                    'module_id' => $module->id,
                    'can_view' => 1,
                    'can_create' => 1,
                    'can_edit' => 0,
                    'can_delete' => 0,
                ],
            ],
        ];

        $response = $this->authPost(route('api.roles.store') . '?action=update_permissions', $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('role_permissions', [
            'role_id' => $role->id,
            'module_id' => $module->id,
            'can_view' => true,
        ]);
    }
}
