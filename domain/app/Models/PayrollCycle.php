<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollCycle extends Model
{
    protected $fillable = ['cycle_name', 'period_start', 'period_end', 'payment_date', 'status', 'total_gross', 'total_deductions', 'total_net', 'approved_by', 'approved_at', 'created_by'];
    protected $casts = [
        'period_start' => 'date', 
        'period_end' => 'date', 
        'payment_date' => 'date', 
        'approved_at' => 'datetime',
        'total_gross' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'total_net' => 'decimal:2'
    ];

    public function items() {
        return $this->hasMany(PayrollItem::class);
    }

    public function approver() {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }
}
