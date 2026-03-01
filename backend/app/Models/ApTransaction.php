<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Accounts Payable sub-ledger transaction.
 * Stores operational metadata only — financial amounts live in the GL.
 * Linked to the GL via voucher_number (SAP FI pattern).
 */
class ApTransaction extends Model
{
    use HasFactory;
    const UPDATED_AT = null;

    protected $fillable = [
        'supplier_id',
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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(ApSupplier::class, 'supplier_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the GL entries for this AP transaction.
     */
    public function glEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }

    /**
     * Get the transaction amount from GL.
     * The amount is always the absolute value of one side of the double-entry.
     */
    public function getAmountAttribute(): float
    {
        return (float) $this->glEntries()
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
    }
}
