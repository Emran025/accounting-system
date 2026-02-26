<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningEnrollment extends Model
{
    protected $fillable = [
        'course_id', 'employee_id', 'enrollment_type', 'status', 'enrollment_date',
        'start_date', 'completion_date', 'due_date', 'progress_percentage', 'score',
        'is_passed', 'certificate_path', 'assigned_by', 'notes'
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'start_date' => 'date',
        'completion_date' => 'date',
        'due_date' => 'date',
        'progress_percentage' => 'integer',
        'score' => 'integer',
        'is_passed' => 'boolean',
    ];

    public function course()
    {
        return $this->belongsTo(LearningCourse::class, 'course_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}

