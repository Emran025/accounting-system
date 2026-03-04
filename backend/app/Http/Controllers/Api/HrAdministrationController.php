<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobTitle;
use App\Models\Employee;
use App\Models\Position;
use App\Models\PermissionTemplate;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class HrAdministrationController extends Controller
{
    use BaseApiController;

    // ══════════════════════════════════════════════════════
    // Job Titles
    // ══════════════════════════════════════════════════════

    public function indexJobTitles(Request $request): JsonResponse
    {
        $query = JobTitle::with('department');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title_ar', 'like', "%{$search}%")
                  ->orWhere('title_en', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $titles = $query->orderBy('title_ar')->get();

        return $this->successResponse($titles->toArray());
    }

    public function storeJobTitle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title_ar' => 'required|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'description' => 'nullable|string',
        ]);

        $validated['created_by'] = auth()->id();
        $title = JobTitle::create($validated);

        return $this->successResponse($title->load('department')->toArray(), 'Job title created');
    }

    public function updateJobTitle(Request $request, $id): JsonResponse
    {
        $title = JobTitle::findOrFail($id);

        $validated = $request->validate([
            'title_ar' => 'string|max:255',
            'title_en' => 'nullable|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $title->update($validated);
        return $this->successResponse($title->load('department')->toArray(), 'Job title updated');
    }

    public function destroyJobTitle($id): JsonResponse
    {
        $title = JobTitle::findOrFail($id);

        // Prevent deletion if positions or employees use this job title
        if (Position::where('job_title_id', $title->id)->exists()) {
            return $this->errorResponse('لا يمكن حذف مسمى مرتبط بمناصب وظيفية', 422);
        }

        if (Employee::where('job_title_id', $title->id)->exists()) {
            return $this->errorResponse('لا يمكن حذف مسمى مرتبط بموظفين', 422);
        }

        $title->delete();
        return $this->successResponse([], 'Job title deleted');
    }

    // ══════════════════════════════════════════════════════
    // Positions Management (Central Hierarchy Link)
    // Employee ← Position ← Role ← Permissions
    // Position ← JobTitle
    // ══════════════════════════════════════════════════════

    public function indexPositions(Request $request): JsonResponse
    {
        $query = Position::with(['jobTitle', 'role', 'department', 'employees' => function ($q) {
            $q->where('is_active', true)->select('id', 'full_name', 'employee_code', 'position_id');
        }]);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('job_title_id')) {
            $query->where('job_title_id', $request->job_title_id);
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('position_name_ar', 'like', "%{$search}%")
                  ->orWhere('position_name_en', 'like', "%{$search}%")
                  ->orWhere('position_code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $positions = $query->orderBy('position_code')->get()->map(function ($position) {
            $position->active_employee_count = $position->employees->count();
            return $position;
        });

        return $this->successResponse($positions->toArray());
    }

    public function showPosition($id): JsonResponse
    {
        $position = Position::with([
            'jobTitle',
            'role.permissions.module',
            'department',
            'employees' => function ($q) {
                $q->where('is_active', true)->select('id', 'full_name', 'employee_code', 'position_id', 'hire_date');
            }
        ])->findOrFail($id);

        return $this->successResponse($position->toArray());
    }

    public function storePosition(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'position_name_ar' => 'required|string|max:255',
            'position_name_en' => 'nullable|string|max:255',
            'job_title_id' => 'required|exists:job_titles,id',
            'role_id' => 'nullable|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'grade_level' => 'nullable|string|max:50',
            'min_salary' => 'nullable|numeric|min:0',
            'max_salary' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $validated['position_code'] = Position::generateCode();
        $validated['created_by'] = auth()->id();

        $position = Position::create($validated);

        return $this->successResponse(
            $position->load(['jobTitle', 'role', 'department'])->toArray(),
            'Position created successfully'
        );
    }

    public function updatePosition(Request $request, $id): JsonResponse
    {
        $position = Position::findOrFail($id);

        $validated = $request->validate([
            'position_name_ar' => 'string|max:255',
            'position_name_en' => 'nullable|string|max:255',
            'job_title_id' => 'exists:job_titles,id',
            'role_id' => 'nullable|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'grade_level' => 'nullable|string|max:50',
            'min_salary' => 'nullable|numeric|min:0',
            'max_salary' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $position->update($validated);

        return $this->successResponse(
            $position->load(['jobTitle', 'role', 'department'])->toArray(),
            'Position updated successfully'
        );
    }

    public function destroyPosition($id): JsonResponse
    {
        $position = Position::findOrFail($id);

        if ($position->employees()->where('is_active', true)->exists()) {
            return $this->errorResponse('Cannot delete position with active employees assigned', 422);
        }

        $position->delete();
        return $this->successResponse([], 'Position deleted');
    }

    /**
     * Assign an employee to a position.
     * This is the primary mechanism for linking an employee into the hierarchy.
     */
    public function assignEmployeeToPosition(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'position_id' => 'required|exists:positions,id',
        ]);

        $employee = Employee::findOrFail($validated['employee_id']);
        $position = Position::with(['jobTitle', 'role'])->findOrFail($validated['position_id']);

        // Auto-sync the role_id and job_title_id from the position
        $updateData = [
            'position_id' => $position->id,
        ];

        if ($position->role_id) {
            $updateData['role_id'] = $position->role_id;
        }

        if ($position->job_title_id) {
            $updateData['job_title_id'] = $position->job_title_id;
        }

        if ($position->department_id) {
            $updateData['department_id'] = $position->department_id;
        }

        $employee->update($updateData);

        return $this->successResponse(
            $employee->load(['position.jobTitle', 'position.role', 'department'])->toArray(),
            'Employee assigned to position successfully'
        );
    }

    /**
     * Remove an employee from their position.
     */
    public function unassignEmployeeFromPosition($employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);
        $employee->update(['position_id' => null]);

        return $this->successResponse([], 'Employee removed from position');
    }


    // ══════════════════════════════════════════════════════
    // Permission Templates
    // ══════════════════════════════════════════════════════

    public function indexTemplates(): JsonResponse
    {
        $templates = PermissionTemplate::where('is_active', true)->orderBy('template_name')->get();
        return $this->successResponse($templates->toArray());
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_name' => 'required|string|max:255',
            'template_key' => 'required|string|max:100|unique:permission_templates,template_key',
            'description' => 'nullable|string',
            'permissions' => 'required|array',
            'permissions.*.module_key' => 'required|string',
            'permissions.*.can_view' => 'required|boolean',
            'permissions.*.can_create' => 'required|boolean',
            'permissions.*.can_edit' => 'required|boolean',
            'permissions.*.can_delete' => 'required|boolean',
        ]);

        $validated['created_by'] = auth()->id();
        $template = PermissionTemplate::create($validated);

        return $this->successResponse($template->toArray(), 'Permission template created');
    }

    public function updateTemplate(Request $request, $id): JsonResponse
    {
        $template = PermissionTemplate::findOrFail($id);

        $validated = $request->validate([
            'template_name' => 'string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'array',
            'is_active' => 'boolean',
        ]);

        $template->update($validated);
        return $this->successResponse($template->toArray(), 'Permission template updated');
    }

    public function applyTemplateToRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_id' => 'required|exists:permission_templates,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        $template = PermissionTemplate::findOrFail($validated['template_id']);
        $role = Role::findOrFail($validated['role_id']);

        foreach ($template->permissions as $perm) {
            $module = Module::where('module_key', $perm['module_key'])->first();
            if (!$module) continue;

            RolePermission::updateOrCreate(
                ['role_id' => $role->id, 'module_id' => $module->id],
                [
                    'can_view' => $perm['can_view'],
                    'can_create' => $perm['can_create'],
                    'can_edit' => $perm['can_edit'],
                    'can_delete' => $perm['can_delete'],
                    'created_by' => auth()->id(),
                ]
            );
        }

        return $this->successResponse([], 'Template applied to role');
    }

}

