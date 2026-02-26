<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeLoan extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'loan_number', 'employee_id', 'loan_type', 'loan_amount', 'interest_rate',
        'installment_count', 'monthly_installment', 'start_date', 'end_date', 'status',
        'remaining_balance', 'auto_deduction', 'deduction_component_id', 'approved_by', 'notes'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'loan_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'monthly_installment' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'auto_deduction' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function repayments()
    {
        return $this->hasMany(LoanRepayment::class, 'loan_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

