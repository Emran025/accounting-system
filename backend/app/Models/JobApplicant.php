<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobApplicant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'requisition_id', 'first_name', 'last_name', 'email', 'phone', 'resume_path',
        'cover_letter_path', 'status', 'match_score', 'screening_notes', 'interview_notes',
        'application_date', 'screened_by', 'interviewed_by', 'is_anonymous', 'notes'
    ];

    protected $casts = [
        'application_date' => 'date',
        'match_score' => 'integer',
        'is_anonymous' => 'boolean',
    ];

    public function requisition()
    {
        return $this->belongsTo(RecruitmentRequisition::class, 'requisition_id');
    }

    public function interviews()
    {
        return $this->hasMany(Interview::class, 'applicant_id');
    }

    public function screenedBy()
    {
        return $this->belongsTo(User::class, 'screened_by');
    }

    public function interviewedBy()
    {
        return $this->belongsTo(User::class, 'interviewed_by');
    }
}

