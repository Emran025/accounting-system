<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContingentContract extends Model
{
    protected $fillable = [
        'worker_id', 'contract_number', 'contract_start_date', 'contract_end_date',
        'status', 'contract_terms', 'file_path', 'total_value', 'renewal_notes', 'created_by'
    ];

    protected $casts = [
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'total_value' => 'decimal:2',
    ];

    public function worker()
    {
        return $this->belongsTo(ContingentWorker::class, 'worker_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

