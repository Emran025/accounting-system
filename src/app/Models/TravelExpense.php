<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TravelExpense extends Model
{
    protected $fillable = [
        'travel_request_id', 'employee_id', 'expense_type', 'expense_date', 'amount',
        'currency', 'exchange_rate', 'amount_in_base_currency', 'receipt_path',
        'description', 'status', 'is_duplicate', 'approved_by', 'notes'
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'amount_in_base_currency' => 'decimal:2',
        'is_duplicate' => 'boolean',
    ];

    public function travelRequest()
    {
        return $this->belongsTo(TravelRequest::class, 'travel_request_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

