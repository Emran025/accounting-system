<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesRepresentativeTransaction extends Model
{
    use HasFactory;
    
    const UPDATED_AT = null;

    protected $fillable = [
        'sales_representative_id',
        'type', // commission, payment, return, adjustment
        'voucher_number',
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
            'is_deleted' => 'boolean',
            'transaction_date' => 'datetime',
            'deleted_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function representative(): BelongsTo
    {
        return $this->belongsTo(SalesRepresentative::class, 'sales_representative_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Financial amount — derived from General Ledger.
     */
    public function getAmountAttribute(): float
    {
        if (!$this->voucher_number) {
            return 0;
        }

        return (float) GeneralLedger::where('voucher_number', $this->voucher_number)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
    }
}
