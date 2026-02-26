<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

/**
 * Model representing an employee's daily attendance record.
 * Tracks check-in/out times, hours worked, overtime, and lateness.
 * 
 * @property int $id
 * @property int $employee_id
 * @property \Carbon\Carbon $attendance_date
 * @property \Carbon\Carbon|null $check_in
 * @property \Carbon\Carbon|null $check_out
 * @property string $status (present, absent, leave, holiday)
 * @property float $hours_worked
 * @property float $overtime_hours
 * @property bool $is_late
 * @property int $late_minutes
 * @property string|null $notes
 * @property string $source (manual, biometric, system)
 * @property int|null $created_by
 */
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

    /**
     * Get the employee who owns this attendance record.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who created this record.
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Calculate hours worked from check-in and check-out times.
     * Returns the difference as a decimal (e.g., 8.5 for 8 hours 30 minutes).
     * 
     * @return float Hours worked, or 0 if check-in/out is missing
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
     * Calculate overtime hours based on standard working hours.
     * 
     * @param float $standardHours Standard daily work hours (default: 8)
     * @return float Overtime hours, or 0 if no overtime
     */
    public function calculateOvertime($standardHours = 8)
    {
        $totalHours = $this->hours_worked;
        return max(0, $totalHours - $standardHours);
    }
}



