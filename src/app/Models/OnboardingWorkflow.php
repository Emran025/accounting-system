<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OnboardingWorkflow extends Model
{
    protected $fillable = [
        'employee_id', 'workflow_type', 'status', 'start_date', 'target_completion_date',
        'actual_completion_date', 'completion_percentage', 'notes', 'assigned_to'
    ];

    protected $casts = [
        'start_date' => 'date',
        'target_completion_date' => 'date',
        'actual_completion_date' => 'date',
        'completion_percentage' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function tasks()
    {
        return $this->hasMany(OnboardingTask::class, 'workflow_id');
    }

    public function documents()
    {
        return $this->hasMany(OnboardingDocument::class, 'workflow_id');
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}

