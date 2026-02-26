<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompensationEntry extends Model
{
    protected $fillable = [
        'compensation_plan_id', 'employee_id', 'current_salary', 'proposed_salary',
        'increase_amount', 'increase_percentage', 'comp_ratio', 'status',
        'justification', 'approved_by'
    ];

    protected $casts = [
        'current_salary' => 'decimal:2',
        'proposed_salary' => 'decimal:2',
        'increase_amount' => 'decimal:2',
        'increase_percentage' => 'decimal:2',
        'comp_ratio' => 'decimal:2',
    ];

    public function plan()
    {
        return $this->belongsTo(CompensationPlan::class, 'compensation_plan_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

