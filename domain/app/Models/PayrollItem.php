<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollItem extends Model
{
    protected $fillable = ['payroll_cycle_id', 'employee_id', 'base_salary', 'total_allowances', 'total_deductions', 'gross_salary', 'net_salary', 'notes'];
    protected $casts = [
        'base_salary' => 'decimal:2',
        'total_allowances' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'net_salary' => 'decimal:2'
    ];

    public function cycle() {
        return $this->belongsTo(PayrollCycle::class, 'payroll_cycle_id');
    }

    public function employee() {
        return $this->belongsTo(Employee::class);
    }
}
