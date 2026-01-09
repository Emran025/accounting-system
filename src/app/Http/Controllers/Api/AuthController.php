<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Services\PermissionService;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class AuthController extends Controller
{
    use BaseApiController;
    private AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function login(Request $request): JsonResponse
    {
        // Start session
        if (!session()->isStarted()) {
            session()->start();
        }

        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $result = $this->authService->login(
            $request->input('username'),
            $request->input('password')
        );

        if ($result['success']) {
            $user = User::with('roleRelation')->find($result['user_id']);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 401);
            }
            $userData = $this->getUserSessionData($user);

            return response()->json([
                'success' => true,
                'user' => $userData,
                'token' => $result['session_token'],
                'permissions' => $userData['permissions'],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => $result['message']
        ], 401);
    }

    public function logout(Request $request): JsonResponse
    {
        $sessionToken = session('session_token');
        if ($sessionToken) {
            $this->authService->logout($sessionToken);
        }
        session()->flush();

        return response()->json(['success' => true]);
    }

    public function check(Request $request): JsonResponse
    {
        // Start session
        if (!session()->isStarted()) {
            session()->start();
        }

        $user = $this->authService->checkSession($request->header('X-Session-Token'));
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $userData = $this->getUserSessionData($user);

        return response()->json([
            'success' => true,
            'user' => $userData,
            'permissions' => $userData['permissions'],
            'authenticated' => true,
        ]);
    }

    private function getUserSessionData(User $user): array
    {
        $permissionsMap = session('permissions');
        
        if (!$permissionsMap) {
            $permissionsMap = PermissionService::loadPermissions($user->role_id);
        }
        
        $formattedPermissions = [];

        foreach ($permissionsMap as $module => $perms) {
            $formattedPermissions[] = [
                'module' => $module,
                'can_view' => (bool)($perms['view'] ?? false),
                'can_create' => (bool)($perms['create'] ?? false),
                'can_edit' => (bool)($perms['edit'] ?? false),
                'can_delete' => (bool)($perms['delete'] ?? false),
            ];
        }

        return [
            'id' => $user->id,
            'username' => $user->username,
            'full_name' => $user->full_name ?? $user->username,
            'role_id' => $user->role_id,
            'role_key' => $user->roleRelation?->role_key ?? $user->role ?? 'cashier',
            'role' => $user->roleRelation?->role_key ?? $user->role ?? 'cashier', // Backward compatibility
            'role_name_ar' => $user->roleRelation?->role_name_ar,
            'role_name_en' => $user->roleRelation?->role_name_en,
            'permissions' => $formattedPermissions,
        ];
    }
}
