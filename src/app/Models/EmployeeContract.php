<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeContract extends Model
{
    protected $fillable = [
        'employee_id',
        'contract_number',
        'contract_start_date',
        'contract_end_date',
        'probation_end_date',
        'base_salary',
        'signing_bonus',
        'retention_allowance',
        'contract_type',
        'working_hours_per_day',
        'working_days_per_week',
        'is_current',
        'renewal_reminder_sent',
        'nda_signed',
        'non_compete_signed',
        'contract_file_path',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'probation_end_date' => 'date',
        'base_salary' => 'decimal:2',
        'signing_bonus' => 'decimal:2',
        'retention_allowance' => 'decimal:2',
        'working_hours_per_day' => 'integer',
        'working_days_per_week' => 'integer',
        'is_current' => 'boolean',
        'renewal_reminder_sent' => 'boolean',
        'nda_signed' => 'boolean',
        'non_compete_signed' => 'boolean'
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



