<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobTitle extends Model
{
    protected $fillable = [
        'title_ar', 'title_en', 'department_id', 'max_headcount',
        'current_headcount', 'description', 'is_active', 'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'max_headcount' => 'integer',
        'current_headcount' => 'integer',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if positions are available for this job title.
     */
    public function hasVacancy(): bool
    {
        return $this->current_headcount < $this->max_headcount;
    }

    /**
     * Get remaining capacity.
     */
    public function getRemainingCapacity(): int
    {
        return max(0, $this->max_headcount - $this->current_headcount);
    }
}
