<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\AttendanceRecord;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AttendanceService
{
    /**
     * Record attendance for an employee
     */
    public function recordAttendance($employeeId, $date, $data)
    {
        return DB::transaction(function () use ($employeeId, $date, $data) {
            $attendance = AttendanceRecord::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'attendance_date' => $date
                ],
                [
                    'check_in' => $data['check_in'] ?? null,
                    'check_out' => $data['check_out'] ?? null,
                    'status' => $data['status'] ?? 'present',
                    'notes' => $data['notes'] ?? null,
                    'source' => $data['source'] ?? 'manual',
                    'created_by' => auth()->id()
                ]
            );

            // Calculate hours if check-in and check-out are provided
            if ($attendance->check_in && $attendance->check_out) {
                $attendance->hours_worked = $attendance->calculateHours();
                
                // Get employee's standard working hours
                $employee = Employee::find($employeeId);
                $standardHours = $employee->contract_type === 'full_time' ? 8 : 4;
                $attendance->overtime_hours = $attendance->calculateOvertime($standardHours);
                
                // Check for late arrival (assuming 9 AM standard start)
                $checkInTime = Carbon::parse($attendance->check_in);
                $standardStart = Carbon::parse($date)->setTime(9, 0);
                if ($checkInTime->gt($standardStart)) {
                    $attendance->is_late = true;
                    $attendance->late_minutes = $checkInTime->diffInMinutes($standardStart);
                }
            }

            $attendance->save();
            return $attendance;
        });
    }

    /**
     * Get attendance records for a period
     */
    public function getAttendanceForPeriod($employeeId, $startDate, $endDate)
    {
        return AttendanceRecord::where('employee_id', $employeeId)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->orderBy('attendance_date')
            ->get();
    }

    /**
     * Calculate total hours worked in a period
     */
    public function calculateTotalHours($employeeId, $startDate, $endDate)
    {
        $records = $this->getAttendanceForPeriod($employeeId, $startDate, $endDate);
        return [
            'total_hours' => $records->sum('hours_worked'),
            'total_overtime' => $records->sum('overtime_hours'),
            'total_days_present' => $records->where('status', 'present')->count(),
            'total_days_absent' => $records->where('status', 'absent')->count(),
            'total_late_minutes' => $records->sum('late_minutes')
        ];
    }

    /**
     * Bulk import attendance records
     */
    public function bulkImport($records)
    {
        return DB::transaction(function () use ($records) {
            $imported = [];
            foreach ($records as $record) {
                $attendance = $this->recordAttendance(
                    $record['employee_id'],
                    $record['date'],
                    [
                        'check_in' => $record['check_in'] ?? null,
                        'check_out' => $record['check_out'] ?? null,
                        'status' => $record['status'] ?? 'present',
                        'source' => 'import'
                    ]
                );
                $imported[] = $attendance;
            }
            return $imported;
        });
    }
}



