<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BenefitsEnrollment extends Model
{
    protected $fillable = [
        'plan_id', 'employee_id', 'enrollment_type', 'enrollment_date', 'effective_date',
        'termination_date', 'status', 'coverage_details', 'notes'
    ];

    protected $casts = [
        'enrollment_date' => 'date',
        'effective_date' => 'date',
        'termination_date' => 'date',
        'coverage_details' => 'array',
    ];

    public function plan()
    {
        return $this->belongsTo(BenefitsPlan::class, 'plan_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

