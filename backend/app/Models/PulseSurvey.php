<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PulseSurvey extends Model
{
    protected $fillable = [
        'survey_name', 'description', 'survey_type', 'questions', 'start_date',
        'end_date', 'is_anonymous', 'target_audience', 'target_departments',
        'target_roles', 'is_active', 'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'questions' => 'array',
        'target_departments' => 'array',
        'target_roles' => 'array',
        'is_anonymous' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function responses()
    {
        return $this->hasMany(SurveyResponse::class, 'survey_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

