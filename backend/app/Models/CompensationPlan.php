<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompensationPlan extends Model
{
    protected $fillable = [
        'plan_name', 'plan_type', 'fiscal_year', 'effective_date', 'status',
        'budget_pool', 'allocated_amount', 'notes', 'created_by', 'approved_by'
    ];

    protected $casts = [
        'effective_date' => 'date',
        'budget_pool' => 'decimal:2',
        'allocated_amount' => 'decimal:2',
    ];

    public function entries()
    {
        return $this->hasMany(CompensationEntry::class, 'compensation_plan_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

