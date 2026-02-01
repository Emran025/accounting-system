<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeContract extends Model
{
    protected $fillable = [
        'employee_id',
        'contract_start_date',
        'contract_end_date',
        'base_salary',
        'contract_type',
        'working_hours_per_day',
        'working_days_per_week',
        'is_current',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'base_salary' => 'decimal:2',
        'working_hours_per_day' => 'integer',
        'working_days_per_week' => 'integer',
        'is_current' => 'boolean'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}



