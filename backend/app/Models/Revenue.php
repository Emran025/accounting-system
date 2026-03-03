<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Revenue sub-ledger record.
 * Stores operational metadata only — financial amounts live in the GL.
 * Linked to the GL via voucher_number (SAP FI pattern).
 */
class Revenue extends Model
{
    use HasFactory;
    protected $fillable = [
        'source',
        'voucher_number',
        'revenue_date',
        'description',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'revenue_date' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the GL entries for this revenue record.
     * The financial amount is derived from these entries.
     */
    public function glEntries(): HasMany
    {
        return $this->hasMany(GeneralLedger::class, 'voucher_number', 'voucher_number');
    }

    /**
     * Get the total amount from the GL (debit side = the cash/asset movement).
     */
    public function getAmountAttribute(): float
    {
        return (float) $this->glEntries()
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
    }
}
