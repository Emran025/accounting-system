<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuccessionPlan extends Model
{
    protected $fillable = [
        'position_id', 'position_title', 'incumbent_id', 'readiness_level',
        'status', 'notes', 'created_by'
    ];

    public function incumbent()
    {
        return $this->belongsTo(Employee::class, 'incumbent_id');
    }

    public function candidates()
    {
        return $this->hasMany(SuccessionCandidate::class, 'succession_plan_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

