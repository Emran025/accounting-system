<?php

namespace App\Services;

use App\Models\Role;
use App\Models\Module;
use App\Models\RolePermission;

/**
 * Service for Role-Based Access Control (RBAC).
 * Loads and checks permissions based on user roles and module-level grants.
 * Supports wildcard permission ('*') for admin roles.
 */
class PermissionService
{
    /**
     * Load all permissions for a given role ID.
     * Joins role_permissions with modules to build a permission map.
     * Admin roles receive wildcard access to all modules.
     * 
     * @param int|null $roleId The role ID to load permissions for
     * @return array<string, array{view: bool, create: bool, edit: bool, delete: bool}>
     */
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

    /**
     * Load permissions by role key (e.g., 'admin', 'manager').
     * Resolves the role key to an ID and delegates to loadPermissions.
     * 
     * @param string $roleKey The unique role key
     * @return array Permission map (same structure as loadPermissions)
     */
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

    /**
     * Check if the current session has permission for a specific action.
     * Checks wildcard permission first, then module-specific permission.
     * 
     * @param string $module The module key (e.g., 'sales', 'inventory')
     * @param string $action The action to check ('view', 'create', 'edit', 'delete')
     * @return bool True if permission is granted
     */
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

    /**
     * Require permission for a module action or abort with 403.
     * Use this as a guard at the beginning of controller methods.
     * 
     * @param string $module The module key
     * @param string $action The action to require
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException 403 if denied
     */
    public static function requirePermission(string $module, string $action = 'view'): void
    {
        if (!self::can($module, $action)) {
            abort(403, 'Access denied');
        }
    }
}

