<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'employee_id',
        'attendance_date',
        'check_in',
        'check_out',
        'status',
        'hours_worked',
        'overtime_hours',
        'is_late',
        'late_minutes',
        'notes',
        'source',
        'created_by'
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'hours_worked' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'is_late' => 'boolean',
        'late_minutes' => 'integer'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate hours worked from check-in and check-out times
     */
    public function calculateHours()
    {
        if (!$this->check_in || !$this->check_out) {
            return 0;
        }

        $checkIn = Carbon::parse($this->check_in);
        $checkOut = Carbon::parse($this->check_out);
        
        $hours = $checkOut->diffInHours($checkIn);
        $minutes = $checkOut->diffInMinutes($checkIn) % 60;
        
        return $hours + ($minutes / 60);
    }

    /**
     * Calculate overtime hours based on standard working hours
     */
    public function calculateOvertime($standardHours = 8)
    {
        $totalHours = $this->hours_worked;
        return max(0, $totalHours - $standardHours);
    }
}



