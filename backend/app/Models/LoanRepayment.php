<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoanRepayment extends Model
{
    protected $fillable = [
        'loan_id', 'installment_number', 'due_date', 'paid_date', 'amount',
        'principal', 'interest', 'status', 'payroll_cycle_id', 'notes'
    ];

    protected $casts = [
        'due_date' => 'date',
        'paid_date' => 'date',
        'amount' => 'decimal:2',
        'principal' => 'decimal:2',
        'interest' => 'decimal:2',
    ];

    public function loan()
    {
        return $this->belongsTo(EmployeeLoan::class, 'loan_id');
    }

    public function payrollCycle()
    {
        return $this->belongsTo(PayrollCycle::class, 'payroll_cycle_id');
    }
}

