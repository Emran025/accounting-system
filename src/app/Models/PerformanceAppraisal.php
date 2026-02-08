<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerformanceAppraisal extends Model
{
    protected $fillable = [
        'appraisal_number', 'employee_id', 'appraisal_type', 'appraisal_period',
        'appraisal_date', 'status', 'ratings', 'self_assessment', 'manager_feedback',
        'peer_feedback', 'overall_rating', 'manager_id', 'reviewed_by', 'notes'
    ];

    protected $casts = [
        'appraisal_date' => 'date',
        'ratings' => 'array',
        'overall_rating' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}

