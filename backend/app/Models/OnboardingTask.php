<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OnboardingTask extends Model
{
    protected $fillable = [
        'workflow_id', 'task_name', 'description', 'task_type', 'department', 'status',
        'sequence_order', 'due_date', 'completed_date', 'assigned_to', 'completed_by', 'notes'
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_date' => 'date',
    ];

    public function workflow()
    {
        return $this->belongsTo(OnboardingWorkflow::class, 'workflow_id');
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}

