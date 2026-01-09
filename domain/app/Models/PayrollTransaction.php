<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollTransaction extends Model
{
    protected $fillable = ['payroll_cycle_id', 'employee_id', 'gl_entry_id', 'amount', 'transaction_type', 'transaction_date', 'description'];
    protected $casts = ['transaction_date' => 'date', 'amount' => 'decimal:2'];

    public function cycle() {
        return $this->belongsTo(PayrollCycle::class, 'payroll_cycle_id');
    }

    public function employee() {
        return $this->belongsTo(Employee::class);
    }

    public function glEntry() {
        return $this->belongsTo(GeneralLedger::class, 'gl_entry_id');
    }
}
