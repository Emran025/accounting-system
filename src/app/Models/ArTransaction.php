<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArTransaction extends Model
{
    protected $fillable = [
        'customer_id',
        'type',
        'amount',
        'description',
        'reference_type',
        'reference_id',
        'transaction_date',
        'created_by',
        'is_deleted',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_deleted' => 'boolean',
            'transaction_date' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(ArCustomer::class, 'customer_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
