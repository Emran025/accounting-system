<?php

namespace App\Services;

use App\Models\Employee;

/**
 * Employee Context Builder
 * 
 * Builds standardized employee context data for template rendering.
 * This service ensures consistent data structure across all HR document templates.
 */
class EmployeeContextBuilder
{
    /**
     * Build context data from Employee model for template rendering.
     * 
     * @param Employee $employee Employee model with relationships loaded
     * @param array $customFields Optional custom fields to override/add
     * @return array Context data ready for template rendering
     */
    public static function build(Employee $employee, array $customFields = []): array
    {
        // Load relationships if not already loaded
        if (!$employee->relationLoaded('department')) {
            $employee->load('department');
        }
        if (!$employee->relationLoaded('role')) {
            $employee->load('role');
        }
        if (!$employee->relationLoaded('currentContract')) {
            $employee->load('currentContract');
        }

        // Build base context
        $context = [
            'employee_name'      => $employee->full_name ?? '',
            'employee_code'      => $employee->employee_code ?? '',
            'employee_national_id' => $employee->national_id ?? '',
            'department'         => $employee->department?->name_ar ?? '',
            'department_en'      => $employee->department?->name_en ?? '',
            'role'               => $employee->role?->role_name_ar ?? '',
            'role_en'            => $employee->role?->role_name_en ?? '',
            'hire_date'          => $employee->hire_date ? date('Y-m-d', strtotime($employee->hire_date)) : '',
            'contract_type'      => $employee->contract_type ?? '',
            'employment_status'  => $employee->employment_status ?? '',
            'base_salary'        => $employee->base_salary ? number_format($employee->base_salary, 2) : '0.00',
            'email'              => $employee->email ?? '',
            'phone'              => $employee->phone ?? '',
        ];

        // Apply custom field overrides
        if (!empty($customFields)) {
            $context = array_merge($context, $customFields);
        }

        return $context;
    }
}

