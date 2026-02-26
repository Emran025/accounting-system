<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\LeaveRequest;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LeaveService
{
    /**
     * Create a leave request
     */
    public function createLeaveRequest($employeeId, $data)
    {
        return DB::transaction(function () use ($employeeId, $data) {
            $startDate = Carbon::parse($data['start_date']);
            $endDate = Carbon::parse($data['end_date']);
            
            // Calculate working days
            $daysRequested = $this->calculateWorkingDays($startDate, $endDate);

            // Check if employee has sufficient balance (for vacation leave)
            if ($data['leave_type'] === 'vacation') {
                $employee = Employee::findOrFail($employeeId);
                if ($employee->vacation_days_balance < $daysRequested) {
                    throw new \Exception("Insufficient vacation days balance. Available: {$employee->vacation_days_balance}, Requested: {$daysRequested}");
                }
            }

            // Check for overlapping leave requests
            $overlapping = LeaveRequest::where('employee_id', $employeeId)
                ->where('status', '!=', 'cancelled')
                ->where(function($query) use ($startDate, $endDate) {
                    $query->whereBetween('start_date', [$startDate, $endDate])
                          ->orWhereBetween('end_date', [$startDate, $endDate])
                          ->orWhere(function($q) use ($startDate, $endDate) {
                              $q->where('start_date', '<=', $startDate)
                                ->where('end_date', '>=', $endDate);
                          });
                })
                ->exists();

            if ($overlapping) {
                throw new \Exception("Leave request overlaps with an existing leave request.");
            }

            $leaveRequest = LeaveRequest::create([
                'employee_id' => $employeeId,
                'leave_type' => $data['leave_type'],
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days_requested' => $daysRequested,
                'reason' => $data['reason'] ?? null,
                'status' => 'pending',
                'created_by' => auth()->id()
            ]);

            return $leaveRequest;
        });
    }

    /**
     * Approve or reject a leave request
     */
    public function processLeaveRequest($leaveRequestId, $action, $userId, $reason = null)
    {
        return DB::transaction(function () use ($leaveRequestId, $action, $userId, $reason) {
            $leaveRequest = LeaveRequest::findOrFail($leaveRequestId);

            if ($leaveRequest->status !== 'pending') {
                throw new \Exception("Leave request has already been processed.");
            }

            $trail = $leaveRequest->approval_trail ?? [];
            $trail[] = [
                'user_id' => $userId,
                'user_name' => auth()->user()->full_name ?? 'System',
                'action' => $action,
                'timestamp' => now()->toDateTimeString()
            ];

            if ($action === 'approved') {
                $leaveRequest->update([
                    'status' => 'approved',
                    'approved_by' => $userId,
                    'approved_at' => now(),
                    'approval_trail' => $trail
                ]);

                // Deduct from vacation balance if applicable
                if ($leaveRequest->leave_type === 'vacation') {
                    $employee = $leaveRequest->employee;
                    $employee->vacation_days_balance -= $leaveRequest->days_requested;
                    $employee->save();
                }
            } else {
                $leaveRequest->update([
                    'status' => 'rejected',
                    'rejection_reason' => $reason,
                    'approval_trail' => $trail
                ]);
            }

            return $leaveRequest;
        });
    }

    /**
     * Check for pending leave requests in a payroll period
     */
    public function hasPendingLeaveRequests($employeeId, $periodStart, $periodEnd)
    {
        return LeaveRequest::where('employee_id', $employeeId)
            ->where('status', 'pending')
            ->where(function($query) use ($periodStart, $periodEnd) {
                $query->whereBetween('start_date', [$periodStart, $periodEnd])
                      ->orWhereBetween('end_date', [$periodStart, $periodEnd])
                      ->orWhere(function($q) use ($periodStart, $periodEnd) {
                          $q->where('start_date', '<=', $periodStart)
                            ->where('end_date', '>=', $periodEnd);
                      });
            })
            ->exists();
    }

    /**
     * Calculate working days between two dates (excluding weekends)
     */
    protected function calculateWorkingDays($startDate, $endDate)
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        $days = 0;

        while ($start <= $end) {
            // Exclude weekends (Friday = 5, Saturday = 6)
            if ($start->dayOfWeek != Carbon::FRIDAY && $start->dayOfWeek != Carbon::SATURDAY) {
                $days++;
            }
            $start->addDay();
        }

        return $days;
    }
}



