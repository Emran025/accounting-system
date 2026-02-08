<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DisciplinaryAction extends Model
{
    protected $fillable = [
        'case_id', 'employee_id', 'action_type', 'violation_description', 'action_taken',
        'action_date', 'expiry_date', 'warning_letter_path', 'issued_by', 'notes'
    ];

    protected $casts = [
        'action_date' => 'date',
        'expiry_date' => 'date',
    ];

    public function case()
    {
        return $this->belongsTo(EmployeeRelationsCase::class, 'case_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function issuedBy()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}

