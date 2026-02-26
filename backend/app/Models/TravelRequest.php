<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TravelRequest extends Model
{
    protected $fillable = [
        'request_number', 'employee_id', 'status', 'destination', 'purpose',
        'departure_date', 'return_date', 'estimated_cost', 'approved_by',
        'approved_at', 'rejection_reason', 'notes'
    ];

    protected $casts = [
        'departure_date' => 'date',
        'return_date' => 'date',
        'approved_at' => 'datetime',
        'estimated_cost' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function expenses()
    {
        return $this->hasMany(TravelExpense::class, 'travel_request_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

