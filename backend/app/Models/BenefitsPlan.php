<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BenefitsPlan extends Model
{
    protected $fillable = [
        'plan_code', 'plan_name', 'plan_type', 'description', 'eligibility_rule',
        'eligibility_criteria', 'employee_contribution', 'employer_contribution',
        'effective_date', 'expiry_date', 'is_active', 'created_by'
    ];

    protected $casts = [
        'eligibility_criteria' => 'array',
        'employee_contribution' => 'decimal:2',
        'employer_contribution' => 'decimal:2',
        'effective_date' => 'date',
        'expiry_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function enrollments()
    {
        return $this->hasMany(BenefitsEnrollment::class, 'plan_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

