<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeRelationsCase extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'case_number', 'employee_id', 'case_type', 'confidentiality_level', 'description',
        'status', 'reported_date', 'resolved_date', 'resolution', 'reported_by',
        'assigned_to', 'notes'
    ];

    protected $casts = [
        'reported_date' => 'date',
        'resolved_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function disciplinaryActions()
    {
        return $this->hasMany(DisciplinaryAction::class, 'case_id');
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}

