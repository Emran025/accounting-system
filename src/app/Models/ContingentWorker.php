<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContingentWorker extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'worker_code', 'full_name', 'email', 'phone', 'worker_type', 'company_name',
        'tax_id', 'start_date', 'end_date', 'status', 'service_description', 'sow_number',
        'hourly_rate', 'monthly_rate', 'contract_terms', 'badge_expiry', 'system_access_expiry',
        'has_insurance', 'insurance_details', 'notes', 'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'badge_expiry' => 'date',
        'system_access_expiry' => 'date',
        'hourly_rate' => 'decimal:2',
        'monthly_rate' => 'decimal:2',
        'has_insurance' => 'boolean',
    ];

    public function contracts()
    {
        return $this->hasMany(ContingentContract::class, 'worker_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

