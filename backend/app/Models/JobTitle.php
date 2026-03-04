<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobTitle extends Model
{
    use HasFactory;

    protected $fillable = [
        'title_ar',
        'title_en',
        'department_id',
        'description',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * Get all positions under this job title.
     */
    public function positions()
    {
        return $this->hasMany(Position::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
