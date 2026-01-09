<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Module;
use App\Models\RolePermission;

class PermissionService
{
    public static function loadPermissions(?int $roleId): array
    {
        if (!$roleId) {
            return [];
        }

        $permissions = RolePermission::where('role_id', $roleId)
            ->join('modules', 'role_permissions.module_id', '=', 'modules.id')
            ->where('modules.is_active', true)
            ->select([
                'modules.module_key',
                'role_permissions.can_view',
                'role_permissions.can_create',
                'role_permissions.can_edit',
                'role_permissions.can_delete',
            ])
            ->get()
            ->mapWithKeys(function ($row) {
                return [
                    $row->module_key => [
                        'view' => (bool)$row->can_view,
                        'create' => (bool)$row->can_create,
                        'edit' => (bool)$row->can_edit,
                        'delete' => (bool)$row->can_delete,
                    ]
                ];
            })
            ->toArray();

        // Check if admin role (wildcard access)
        $role = Role::find($roleId);
        if ($role && $role->role_key === 'admin') {
            $permissions['*'] = [
                'view' => true,
                'create' => true,
                'edit' => true,
                'delete' => true,
            ];
        }

        return $permissions;
    }

    public static function loadPermissionsByKey(string $roleKey): array
    {
        $role = Role::where('role_key', $roleKey)
            ->where('is_active', true)
            ->first();

        if (!$role) {
            return [];
        }

        return self::loadPermissions($role->id);
    }

    public static function can(string $module, string $action = 'view'): bool
    {
        $permissions = session('permissions', []);

        // Check wildcard permission
        if (isset($permissions['*'])) {
            return $permissions['*'][$action] ?? false;
        }

        // Check module-specific permission
        if (isset($permissions[$module])) {
            return $permissions[$module][$action] ?? false;
        }

        return false;
    }

    public static function requirePermission(string $module, string $action = 'view'): void
    {
        if (!self::can($module, $action)) {
            abort(403, 'Access denied');
        }
    }
}

