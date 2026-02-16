<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobTitle;
use App\Models\Employee;
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
    // Job Titles & Capacity Planning
    // ══════════════════════════════════════════════════════

    public function indexJobTitles(Request $request): JsonResponse
    {
        $query = JobTitle::with('department');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('search')) {
            $query->where('title_ar', 'like', "%{$request->search}%");
        }

        $titles = $query->orderBy('title_ar')->get()->map(function ($title) {
            $actual = Employee::where('job_title_id', $title->id)->where('is_active', true)->count();
            $title->current_headcount = $actual;
            $title->vacancy_count = max(0, $title->max_headcount - $actual);
            return $title;
        });

        return $this->successResponse($titles->toArray());
    }

    public function storeJobTitle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title_ar' => 'required|string|max:255',
            'title_en' => 'nullable|string|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'max_headcount' => 'required|integer|min:1',
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
            'max_headcount' => 'integer|min:1',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $title->update($validated);
        return $this->successResponse($title->load('department')->toArray(), 'Job title updated');
    }

    public function destroyJobTitle($id): JsonResponse
    {
        $title = JobTitle::findOrFail($id);

        if (Employee::where('job_title_id', $title->id)->exists()) {
            return $this->errorResponse('Cannot delete job title with assigned employees', 422);
        }

        $title->delete();
        return $this->successResponse([], 'Job title deleted');
    }

    // ══════════════════════════════════════════════════════
    // Employee-User Linking
    // ══════════════════════════════════════════════════════

    public function linkEmployeeToUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'user_id' => 'required|exists:users,id',
        ]);

        $employee = Employee::findOrFail($validated['employee_id']);
        $employee->update(['user_id' => $validated['user_id']]);

        return $this->successResponse($employee->toArray(), 'Employee linked to user');
    }

    public function unlinkEmployee($employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);
        $employee->update(['user_id' => null]);

        return $this->successResponse([], 'Employee unlinked from user');
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

    // ══════════════════════════════════════════════════════
    // Capacity Overview Dashboard
    // ══════════════════════════════════════════════════════

    public function capacityOverview(): JsonResponse
    {
        $titles = JobTitle::with('department')->where('is_active', true)->get()->map(function ($title) {
            $actual = Employee::where('job_title_id', $title->id)->where('is_active', true)->count();
            return [
                'id' => $title->id,
                'title_ar' => $title->title_ar,
                'department' => $title->department?->name_ar ?? 'غير محدد',
                'max_headcount' => $title->max_headcount,
                'current_headcount' => $actual,
                'vacancy_count' => max(0, $title->max_headcount - $actual),
                'utilization_pct' => $title->max_headcount > 0 ? round(($actual / $title->max_headcount) * 100) : 0,
            ];
        });

        return $this->successResponse([
            'job_titles' => $titles,
            'total_positions' => $titles->sum('max_headcount'),
            'total_filled' => $titles->sum('current_headcount'),
            'total_vacancies' => $titles->sum('vacancy_count'),
        ]);
    }
}
