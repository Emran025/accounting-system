<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeCertification extends Model
{
    protected $fillable = [
        'employee_id', 'certification_name', 'issuing_organization', 'certification_number',
        'issue_date', 'expiry_date', 'is_recurring', 'recurrence_months', 'file_path', 'notes'
    ];

    protected $casts = [
        'issue_date' => 'date',
        'expiry_date' => 'date',
        'is_recurring' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}

