<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CorporateAnnouncement extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title', 'content', 'priority', 'target_audience', 'target_departments',
        'target_roles', 'target_locations', 'target_employees', 'publish_date',
        'expiry_date', 'is_published', 'created_by'
    ];

    protected $casts = [
        'publish_date' => 'date',
        'expiry_date' => 'date',
        'target_departments' => 'array',
        'target_roles' => 'array',
        'target_locations' => 'array',
        'target_employees' => 'array',
        'is_published' => 'boolean',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

