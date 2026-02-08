<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SurveyResponse extends Model
{
    protected $fillable = [
        'survey_id', 'employee_id', 'responses', 'submitted_at'
    ];

    protected $casts = [
        'responses' => 'array',
        'submitted_at' => 'datetime',
    ];

    public function survey()
    {
        return $this->belongsTo(PulseSurvey::class, 'survey_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

