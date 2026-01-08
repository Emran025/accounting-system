<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Session;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Api\BaseApiController;

class UsersController extends Controller
{
    use BaseApiController;

    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('users', 'view');

        $users = User::with(['roleRelation', 'manager', 'createdBy'])
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'full_name' => $user->full_name,
                    'role' => $user->roleRelation?->role_key ?? $user->role,
                    'role_id' => $user->role_id,
                    'is_active' => $user->is_active,
                    'manager_id' => $user->manager_id,
                    'manager_name' => $user->manager?->username,
                    'created_by' => $user->created_by,
                    'creator_name' => $user->createdBy?->username,
                    'created_at' => $user->created_at,
                ];
            });

        return $this->successResponse($users);
    }

    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('users', 'create');

        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users',
            'password' => 'required|string|min:6',
            'full_name' => 'nullable|string|max:100',
            'role' => 'nullable|string|max:20',
            'role_id' => 'nullable|exists:roles,id',
            'is_active' => 'nullable|boolean',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'full_name' => $validated['full_name'] ?? null,
            'role' => $validated['role'] ?? 'sales',
            'role_id' => $validated['role_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'manager_id' => $validated['manager_id'] ?? null,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'users', $user->id, null, $validated);

        return $this->successResponse(['id' => $user->id]);
    }

    public function update(Request $request): JsonResponse
    {
        PermissionService::requirePermission('users', 'edit');

        $validated = $request->validate([
            'id' => 'required|exists:users,id',
            'username' => 'required|string|max:50',
            'password' => 'nullable|string|min:6',
            'full_name' => 'nullable|string|max:100',
            'role' => 'nullable|string|max:20',
            'role_id' => 'nullable|exists:roles,id',
            'is_active' => 'nullable|boolean',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $user = User::findOrFail($validated['id']);
        $oldValues = $user->toArray();

        $updateData = [
            'username' => $validated['username'],
            'full_name' => $validated['full_name'] ?? null,
            'role' => $validated['role'] ?? $user->role,
            'role_id' => $validated['role_id'] ?? null,
            'is_active' => $validated['is_active'] ?? $user->is_active,
            'manager_id' => $validated['manager_id'] ?? null,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        TelescopeService::logOperation('UPDATE', 'users', $user->id, $oldValues, $updateData);

        return $this->successResponse();
    }

    public function destroy(Request $request): JsonResponse
    {
        PermissionService::requirePermission('users', 'delete');

        $id = $request->input('id');
        $user = User::findOrFail($id);
        $oldValues = $user->toArray();
        $user->delete();

        TelescopeService::logOperation('DELETE', 'users', $id, $oldValues, null);

        return $this->successResponse();
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = User::findOrFail(auth()->id() ?? session('user_id'));

        if (!Hash::check($validated['current_password'], $user->password)) {
            return $this->errorResponse('Current password is incorrect', 400);
        }

        $user->update(['password' => Hash::make($validated['new_password'])]);

        return $this->successResponse([], 'Password changed successfully');
    }

    public function managerList(): JsonResponse
    {
        $managers = User::where('role', 'manager')
            ->orWhere('role', 'admin')
            ->get(['id', 'username']);

        return $this->successResponse($managers);
    }

    public function roles(): JsonResponse
    {
        $roles = \App\Models\Role::all(['id', 'role_name_ar as name', 'role_key']);
        return response()->json(['success' => true, 'roles' => $roles]);
    }

    public function mySessions(): JsonResponse
    {
        $userId = auth()->id() ?? session('user_id');
        $sessions = Session::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse(['sessions' => $sessions]);
    }
}
