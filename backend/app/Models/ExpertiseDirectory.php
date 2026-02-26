<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExpertiseDirectory extends Model
{
    protected $table = 'expertise_directory';

    protected $fillable = [
        'employee_id', 'skill_name', 'proficiency_level', 'years_of_experience',
        'description', 'certifications', 'projects', 'is_available_for_projects'
    ];

    protected $casts = [
        'certifications' => 'array',
        'projects' => 'array',
        'is_available_for_projects' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

