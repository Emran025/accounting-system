<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\PayrollComponent;
use App\Models\AttendanceRecord;
use App\Models\LeaveRequest;
use Carbon\Carbon;

class SalaryCalculatorService implements SalaryCalculatorInterface
{
    protected $attendanceService;
    protected $leaveService;

    public function __construct(
        AttendanceService $attendanceService,
        LeaveService $leaveService
    ) {
        $this->attendanceService = $attendanceService;
        $this->leaveService = $leaveService;
    }

    /**
     * Calculate payroll breakdown for an employee
     */
    public function calculate(Employee $employee, string $periodStart, string $periodEnd): array
    {
        // Get base salary from current contract
        $baseSalary = $this->getBaseSalary($employee, $periodStart);

        // Get attendance data
        $attendanceData = $this->attendanceService->calculateTotalHours(
            $employee->id,
            $periodStart,
            $periodEnd
        );

        // Calculate pro-rata if employee has unpaid leave
        $unpaidLeaveDays = $this->getUnpaidLeaveDays($employee->id, $periodStart, $periodEnd);
        $workingDaysInPeriod = $this->getWorkingDaysInPeriod($periodStart, $periodEnd);
        $actualWorkingDays = $workingDaysInPeriod - $unpaidLeaveDays;
        
        // Pro-rata base salary
        $proratedBase = ($baseSalary / $workingDaysInPeriod) * $actualWorkingDays;

        // Calculate allowances
        $allowances = $this->calculateAllowances($employee, $proratedBase, $attendanceData);

        // Calculate overtime
        $overtime = $this->calculateOvertime($employee, $attendanceData['total_overtime']);

        // Calculate deductions
        $deductions = $this->calculateDeductions($employee, $proratedBase, $attendanceData);

        // Calculate gross and net
        $grossSalary = $proratedBase + $allowances + $overtime;
        $netSalary = $grossSalary - $deductions;

        return [
            'base_salary' => $proratedBase,
            'total_allowances' => $allowances,
            'total_deductions' => $deductions,
            'overtime' => $overtime,
            'gross_salary' => $grossSalary,
            'net_salary' => $netSalary,
            'attendance_summary' => $attendanceData,
            'unpaid_leave_days' => $unpaidLeaveDays
        ];
    }

    /**
     * Get base salary for the period
     */
    protected function getBaseSalary(Employee $employee, string $periodStart)
    {
        // Check if employee has a contract for this period
        $contract = \App\Models\EmployeeContract::where('employee_id', $employee->id)
            ->where('contract_start_date', '<=', $periodStart)
            ->where(function($query) use ($periodStart) {
                $query->whereNull('contract_end_date')
                      ->orWhere('contract_end_date', '>=', $periodStart);
            })
            ->where('is_current', true)
            ->first();

        return $contract ? $contract->base_salary : $employee->base_salary;
    }

    /**
     * Calculate allowances using payroll components
     */
    protected function calculateAllowances(Employee $employee, float $baseSalary, array $attendanceData): float
    {
        $total = 0;

        // Get active allowance components
        $components = PayrollComponent::where('component_type', 'allowance')
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();

        // Employee-specific allowances (from existing system)
        $employeeAllowances = $employee->allowances()->where('is_active', true)->get();
        foreach ($employeeAllowances as $allowance) {
            $total += $allowance->amount;
        }

        // Calculate from components
        foreach ($components as $component) {
            $context = [
                'base_salary' => $baseSalary,
                'hours' => $attendanceData['total_hours'],
                'overtime_hours' => $attendanceData['total_overtime'],
                'rate' => $baseSalary / 160 // Assuming 160 hours per month
            ];
            $total += $component->calculate($baseSalary, $context);
        }

        return $total;
    }

    /**
     * Calculate overtime pay
     */
    protected function calculateOvertime(Employee $employee, float $overtimeHours): float
    {
        if ($overtimeHours <= 0) {
            return 0;
        }

        // Get overtime component or use default 1.5x rate
        $overtimeComponent = PayrollComponent::where('component_type', 'overtime')
            ->where('is_active', true)
            ->first();

        if ($overtimeComponent) {
            $hourlyRate = $employee->base_salary / 160; // Assuming 160 hours per month
            $context = [
                'base_salary' => $employee->base_salary,
                'hours' => $overtimeHours,
                'rate' => $hourlyRate
            ];
            return $overtimeComponent->calculate($employee->base_salary, $context);
        }

        // Default: 1.5x hourly rate
        $hourlyRate = $employee->base_salary / 160;
        return $overtimeHours * $hourlyRate * 1.5;
    }

    /**
     * Calculate deductions
     */
    protected function calculateDeductions(Employee $employee, float $baseSalary, array $attendanceData): float
    {
        $total = 0;

        // Employee-specific deductions
        $employeeDeductions = $employee->deductions()->where('is_active', true)->get();
        foreach ($employeeDeductions as $deduction) {
            $total += $deduction->amount;
        }

        // Late arrival deductions
        if ($attendanceData['total_late_minutes'] > 0) {
            $lateDeductionComponent = PayrollComponent::where('component_type', 'deduction')
                ->where('calculation_type', 'attendance_based')
                ->where('is_active', true)
                ->first();

            if ($lateDeductionComponent) {
                $context = [
                    'late_minutes' => $attendanceData['total_late_minutes'],
                    'base_salary' => $baseSalary
                ];
                $total += $lateDeductionComponent->calculate($baseSalary, $context);
            }
        }

        // Component-based deductions
        $components = PayrollComponent::where('component_type', 'deduction')
            ->where('is_active', true)
            ->where('calculation_type', '!=', 'attendance_based')
            ->get();

        foreach ($components as $component) {
            $context = [
                'base_salary' => $baseSalary,
                'hours' => $attendanceData['total_hours']
            ];
            $total += $component->calculate($baseSalary, $context);
        }

        return $total;
    }

    /**
     * Get unpaid leave days in period
     */
    protected function getUnpaidLeaveDays(int $employeeId, string $periodStart, string $periodEnd): float
    {
        $unpaidLeaves = LeaveRequest::where('employee_id', $employeeId)
            ->where('leave_type', 'unpaid')
            ->where('status', 'approved')
            ->where(function($query) use ($periodStart, $periodEnd) {
                $query->whereBetween('start_date', [$periodStart, $periodEnd])
                      ->orWhereBetween('end_date', [$periodStart, $periodEnd])
                      ->orWhere(function($q) use ($periodStart, $periodEnd) {
                          $q->where('start_date', '<=', $periodStart)
                            ->where('end_date', '>=', $periodEnd);
                      });
            })
            ->get();

        $totalDays = 0;
        foreach ($unpaidLeaves as $leave) {
            $overlapStart = max(Carbon::parse($leave->start_date), Carbon::parse($periodStart));
            $overlapEnd = min(Carbon::parse($leave->end_date), Carbon::parse($periodEnd));
            $days = $this->calculateWorkingDays($overlapStart, $overlapEnd);
            $totalDays += $days;
        }

        return $totalDays;
    }

    /**
     * Get working days in period (excluding weekends)
     */
    protected function getWorkingDaysInPeriod(string $periodStart, string $periodEnd): int
    {
        return $this->calculateWorkingDays(
            Carbon::parse($periodStart),
            Carbon::parse($periodEnd)
        );
    }

    /**
     * Calculate working days between two dates
     */
    protected function calculateWorkingDays(Carbon $start, Carbon $end): int
    {
        $days = 0;
        $current = $start->copy();

        while ($current <= $end) {
            if ($current->dayOfWeek != Carbon::FRIDAY && $current->dayOfWeek != Carbon::SATURDAY) {
                $days++;
            }
            $current->addDay();
        }

        return $days;
    }
}



