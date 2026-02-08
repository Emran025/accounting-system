<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecruitmentRequisition extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'requisition_number', 'job_title', 'job_description', 'department_id', 'role_id',
        'number_of_positions', 'employment_type', 'budgeted_salary_min', 'budgeted_salary_max',
        'status', 'target_start_date', 'required_qualifications', 'preferred_qualifications',
        'requested_by', 'approved_by', 'approved_at', 'rejection_reason', 'is_published', 'notes'
    ];

    protected $casts = [
        'target_start_date' => 'date',
        'approved_at' => 'datetime',
        'budgeted_salary_min' => 'decimal:2',
        'budgeted_salary_max' => 'decimal:2',
        'is_published' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function applicants()
    {
        return $this->hasMany(JobApplicant::class, 'requisition_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

