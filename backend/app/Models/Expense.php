<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Expense sub-ledger record.
 * Stores operational metadata only — financial amounts live in the GL.
 * Linked to the GL via voucher_number (SAP FI pattern).
 */
class Expense extends Model
{
    use HasFactory;
    protected $fillable = [
        'category',
        'account_code',
        'voucher_number',
        'expense_date',
        'description',
        'payment_type',
        'supplier_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'expense_date' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(ApSupplier::class, 'supplier_id');
    }

    /**
     * Get the GL entries for this expense record.
     */
    public function glEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }

    /**
     * Get the total amount from the GL (debit side = expense account).
     */
    public function getAmountAttribute(): float
    {
        return (float) $this->glEntries()
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
    }
}
