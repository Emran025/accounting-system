<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class QaCompliance extends Model
{
    use SoftDeletes;

    protected $table = 'qa_compliance';

    protected $fillable = [
        'compliance_number', 'compliance_type', 'standard_name', 'description', 'employee_id',
        'status', 'due_date', 'completed_date', 'findings', 'corrective_action',
        'assigned_to', 'completed_by', 'notes'
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function capas()
    {
        return $this->hasMany(Capa::class, 'compliance_id');
    }

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}

