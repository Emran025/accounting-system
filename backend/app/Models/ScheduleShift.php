<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScheduleShift extends Model
{
    protected $fillable = [
        'schedule_id', 'employee_id', 'shift_date', 'start_time', 'end_time',
        'shift_type', 'hours', 'status', 'swapped_with', 'notes'
    ];

    protected $casts = [
        'shift_date' => 'date',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'hours' => 'decimal:2',
    ];

    public function schedule()
    {
        return $this->belongsTo(WorkforceSchedule::class, 'schedule_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function swappedWith()
    {
        return $this->belongsTo(Employee::class, 'swapped_with');
    }
}

