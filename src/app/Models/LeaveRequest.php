<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class LeaveRequest extends Model
{
    protected $fillable = [
        'employee_id',
        'leave_type',
        'start_date',
        'end_date',
        'days_requested',
        'reason',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'approval_trail',
        'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'days_requested' => 'decimal:2',
        'approved_at' => 'datetime',
        'approval_trail' => 'array'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate number of working days between start and end date
     */
    public function calculateWorkingDays()
    {
        $start = Carbon::parse($this->start_date);
        $end = Carbon::parse($this->end_date);
        $days = 0;

        while ($start <= $end) {
            // Exclude weekends (Friday = 5, Saturday = 6 in Carbon)
            if ($start->dayOfWeek != Carbon::FRIDAY && $start->dayOfWeek != Carbon::SATURDAY) {
                $days++;
            }
            $start->addDay();
        }

        return $days;
    }

    /**
     * Check if leave request overlaps with payroll period
     */
    public function overlapsWithPeriod($periodStart, $periodEnd)
    {
        $start = Carbon::parse($this->start_date);
        $end = Carbon::parse($this->end_date);
        $periodStart = Carbon::parse($periodStart);
        $periodEnd = Carbon::parse($periodEnd);

        return $start <= $periodEnd && $end >= $periodStart;
    }
}



