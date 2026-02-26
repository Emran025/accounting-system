<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Currency Ledger Entry Model
 * 
 * Extends the general ledger to support multi-currency balances.
 * Links to general ledger entries and stores original currency amounts.
 * 
 * @property int $id
 * @property int $general_ledger_id
 * @property int $currency_id
 * @property float $original_amount
 * @property float|null $exchange_rate
 * @property float|null $reference_amount
 * @property bool $is_revalued
 * @property string|null $last_revaluation_at
 */
class CurrencyLedgerEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'general_ledger_id',
        'currency_id',
        'original_amount',
        'exchange_rate',
        'reference_amount',
        'is_revalued',
        'last_revaluation_at',
    ];

    protected $casts = [
        'original_amount' => 'decimal:4',
        'exchange_rate' => 'decimal:8',
        'reference_amount' => 'decimal:4',
        'is_revalued' => 'boolean',
        'last_revaluation_at' => 'datetime',
    ];

    /**
     * Get the general ledger entry
     */
    public function generalLedger(): BelongsTo
    {
        return $this->belongsTo(GeneralLedger::class);
    }

    /**
     * Get the currency
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Create a currency ledger entry for a general ledger entry
     */
    public static function createForLedgerEntry(
        int $generalLedgerId,
        int $currencyId,
        float $originalAmount,
        ?float $exchangeRate = null,
        ?float $referenceAmount = null
    ): self {
        return static::create([
            'general_ledger_id' => $generalLedgerId,
            'currency_id' => $currencyId,
            'original_amount' => $originalAmount,
            'exchange_rate' => $exchangeRate,
            'reference_amount' => $referenceAmount,
            'is_revalued' => false,
        ]);
    }

    /**
     * Apply revaluation to this entry
     */
    public function applyRevaluation(float $newExchangeRate, float $newReferenceAmount): void
    {
        $this->update([
            'exchange_rate' => $newExchangeRate,
            'reference_amount' => $newReferenceAmount,
            'is_revalued' => true,
            'last_revaluation_at' => now(),
        ]);
    }

    /**
     * Get the unrealized gain/loss from revaluation
     */
    public function getUnrealizedGainLoss(): float
    {
        if (!$this->reference_amount || !$this->exchange_rate) {
            return 0.0;
        }

        $currentReferenceValue = $this->original_amount * $this->exchange_rate;
        return $currentReferenceValue - (float) $this->reference_amount;
    }

    /**
     * Scope for entries in a specific currency
     */
    public function scopeInCurrency($query, int $currencyId)
    {
        return $query->where('currency_id', $currencyId);
    }

    /**
     * Scope for entries that have been revalued
     */
    public function scopeRevalued($query)
    {
        return $query->where('is_revalued', true);
    }

    /**
     * Scope for entries that have not been revalued
     */
    public function scopeNotRevalued($query)
    {
        return $query->where('is_revalued', false);
    }
}
