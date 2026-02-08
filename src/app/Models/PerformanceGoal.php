<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerformanceGoal extends Model
{
    protected $fillable = [
        'employee_id', 'goal_title', 'goal_description', 'goal_type', 'parent_goal_id',
        'status', 'target_value', 'current_value', 'unit', 'start_date', 'target_date',
        'completed_date', 'progress_percentage', 'notes', 'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'target_date' => 'date',
        'completed_date' => 'date',
        'target_value' => 'decimal:2',
        'current_value' => 'decimal:2',
        'progress_percentage' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function parentGoal()
    {
        return $this->belongsTo(PerformanceGoal::class, 'parent_goal_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

