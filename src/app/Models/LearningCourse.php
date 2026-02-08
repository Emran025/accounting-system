<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LearningCourse extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'course_code', 'course_name', 'description', 'delivery_method', 'course_type',
        'duration_hours', 'scorm_path', 'video_url', 'is_recurring', 'recurrence_months',
        'requires_assessment', 'passing_score', 'is_published', 'created_by'
    ];

    protected $casts = [
        'is_recurring' => 'boolean',
        'requires_assessment' => 'boolean',
        'is_published' => 'boolean',
    ];

    public function enrollments()
    {
        return $this->hasMany(LearningEnrollment::class, 'course_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

