<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WellnessParticipation extends Model
{
    protected $fillable = [
        'program_id', 'employee_id', 'metrics_data', 'points', 'status',
        'enrollment_date', 'notes'
    ];

    protected $casts = [
        'metrics_data' => 'array',
        'enrollment_date' => 'date',
    ];

    public function program()
    {
        return $this->belongsTo(WellnessProgram::class, 'program_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

