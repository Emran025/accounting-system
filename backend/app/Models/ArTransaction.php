<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Accounts Receivable sub-ledger transaction.
 * Stores operational metadata only — financial amounts live in the GL.
 * Linked to the GL via voucher_number (SAP FI pattern).
 */
class ArTransaction extends Model
{
    use HasFactory;
    const UPDATED_AT = null;

    protected $fillable = [
        'customer_id',
        'type',
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

    public function customer(): BelongsTo
    {
        return $this->belongsTo(ArCustomer::class, 'customer_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the GL entries for this AR transaction.
     */
    public function glEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }

    /**
     * Get the transaction amount from GL.
     * For AR: the amount is the DEBIT side when type=invoice (AR increases),
     * and the CREDIT side when type=payment/receipt/return (AR decreases).
     */
    public function getAmountAttribute(): float
    {
        if ($this->type === 'invoice') {
            // Invoice: Dr AR, so look at DEBIT side
            return (float) $this->glEntries()
                ->where('entry_type', 'DEBIT')
                ->sum('amount');
        }
        // Payment/Receipt/Return: Dr Cash or Dr Sales Revenue, so the GL amount is on either side (total document value = sum of debits)
        return (float) $this->glEntries()
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
    }
}
