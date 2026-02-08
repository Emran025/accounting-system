<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkforceSchedule extends Model
{
    protected $fillable = [
        'schedule_name', 'schedule_date', 'department_id', 'status', 'notes', 'created_by'
    ];

    protected $casts = [
        'schedule_date' => 'date',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function shifts()
    {
        return $this->hasMany(ScheduleShift::class, 'schedule_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

