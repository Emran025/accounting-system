<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuccessionCandidate extends Model
{
    protected $fillable = [
        'succession_plan_id', 'employee_id', 'readiness_level', 'performance_rating',
        'potential_rating', 'development_plan', 'notes'
    ];

    public function successionPlan()
    {
        return $this->belongsTo(SuccessionPlan::class, 'succession_plan_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

