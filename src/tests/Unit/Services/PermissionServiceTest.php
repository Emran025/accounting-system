<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\PermissionService;
use App\Models\Role;
use App\Models\Module;
use App\Models\RolePermission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PermissionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_load_permissions_returns_mapped_permissions()
    {
        $role = Role::factory()->create();
        $module = Module::factory()->create(['module_key' => 'invoices', 'is_active' => true]);
        
        RolePermission::factory()->create([
            'role_id' => $role->id,
            'module_id' => $module->id,
            'can_view' => true,
            'can_create' => true,
            'can_edit' => false,
            'can_delete' => false,
        ]);

        $permissions = PermissionService::loadPermissions($role->id);

        $this->assertTrue($permissions['invoices']['view']);
        $this->assertTrue($permissions['invoices']['create']);
        $this->assertFalse($permissions['invoices']['edit']);
    }

    public function test_admin_role_has_wildcard_permissions()
    {
        $adminRole = Role::factory()->create(['role_key' => 'admin']);
        
        $permissions = PermissionService::loadPermissions($adminRole->id);

        $this->assertTrue($permissions['*']['view']);
        $this->assertTrue($permissions['*']['delete']);
    }

    public function test_can_checks_session_permissions()
    {
        session(['permissions' => [
            'invoices' => ['view' => true, 'delete' => false]
        ]]);

        $this->assertTrue(PermissionService::can('invoices', 'view'));
        $this->assertFalse(PermissionService::can('invoices', 'delete'));
        $this->assertFalse(PermissionService::can('products', 'view'));
    }

    public function test_require_permission_aborts_on_failure()
    {
        session(['permissions' => []]);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        $this->expectExceptionMessage('Access denied');

        PermissionService::requirePermission('invoices', 'view');
    }
}
