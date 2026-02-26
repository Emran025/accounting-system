<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostPayrollIntegration extends Model
{
    protected $fillable = [
        'payroll_cycle_id', 'integration_type', 'status', 'file_path', 'file_format',
        'total_amount', 'transaction_count', 'error_message', 'processed_at',
        'reconciled_at', 'processed_by', 'notes'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'processed_at' => 'datetime',
        'reconciled_at' => 'datetime',
    ];

    public function payrollCycle()
    {
        return $this->belongsTo(PayrollCycle::class, 'payroll_cycle_id');
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}

