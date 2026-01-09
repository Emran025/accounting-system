<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollTransaction extends Model
{
    protected $fillable = [
        'payroll_item_id', 'employee_id', 'amount', 
        'transaction_type', 'transaction_date', 'notes', 'created_by'
    ];
    
    protected $casts = [
        'transaction_date' => 'date',
        'amount' => 'decimal:2'
    ];

    public function payrollItem() {
        return $this->belongsTo(PayrollItem::class);
    }

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function creator() {
        return $this->belongsTo(User::class, 'created_by');
    }
}
