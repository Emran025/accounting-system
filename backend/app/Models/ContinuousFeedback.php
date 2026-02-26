<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContinuousFeedback extends Model
{
    protected $fillable = [
        'employee_id', 'given_by', 'feedback_type', 'feedback_content',
        'feedback_date', 'is_visible_to_employee', 'notes'
    ];

    protected $casts = [
        'feedback_date' => 'date',
        'is_visible_to_employee' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function givenBy()
    {
        return $this->belongsTo(Employee::class, 'given_by');
    }
}

