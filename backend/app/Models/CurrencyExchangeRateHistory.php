<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Currency Exchange Rate History Model
 * 
 * Preserves historical exchange rates for auditing and historical reporting.
 * Critical for maintaining ledger truth across policy changes.
 * 
 * @property int $id
 * @property int $currency_id
 * @property int $target_currency_id
 * @property float $exchange_rate
 * @property string $effective_date
 * @property string|null $effective_time
 * @property string $source
 * @property string|null $source_reference
 */
class CurrencyExchangeRateHistory extends Model
{
    use HasFactory;

    protected $table = 'currency_exchange_rate_history';

    protected $fillable = [
        'currency_id',
        'target_currency_id',
        'exchange_rate',
        'effective_date',
        'effective_time',
        'source',
        'source_reference',
        'created_by',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:8',
        'effective_date' => 'date',
    ];

    /**
     * Get the source currency
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Get the target currency
     */
    public function targetCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'target_currency_id');
    }

    /**
     * Get the user who created this rate entry
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the effective rate for a currency pair on a specific date
     * 
     * @param int $sourceCurrencyId
     * @param int $targetCurrencyId
     * @param string $date Y-m-d format
     * @return float|null
     */
    public static function getRateOnDate(int $sourceCurrencyId, int $targetCurrencyId, string $date): ?float
    {
        // If same currency, rate is 1
        if ($sourceCurrencyId === $targetCurrencyId) {
            return 1.0;
        }

        // Try to find the most recent rate on or before the given date
        $rate = static::where('currency_id', $sourceCurrencyId)
            ->where('target_currency_id', $targetCurrencyId)
            ->where('effective_date', '<=', $date)
            ->orderBy('effective_date', 'desc')
            ->orderBy('effective_time', 'desc')
            ->first();

        return $rate?->exchange_rate;
    }

    /**
     * Record a new exchange rate
     */
    public static function recordRate(
        int $sourceCurrencyId,
        int $targetCurrencyId,
        float $rate,
        string $date,
        string $source = 'MANUAL',
        ?string $sourceReference = null,
        ?int $createdBy = null
    ): self {
        return static::create([
            'currency_id' => $sourceCurrencyId,
            'target_currency_id' => $targetCurrencyId,
            'exchange_rate' => $rate,
            'effective_date' => $date,
            'effective_time' => now()->format('H:i:s'),
            'source' => $source,
            'source_reference' => $sourceReference,
            'created_by' => $createdBy ?? auth()->id(),
        ]);
    }

    /**
     * Scope for a specific currency pair
     */
    public function scopeForPair($query, int $sourceCurrencyId, int $targetCurrencyId)
    {
        return $query->where('currency_id', $sourceCurrencyId)
            ->where('target_currency_id', $targetCurrencyId);
    }

    /**
     * Scope for rates from a specific source
     */
    public function scopeFromSource($query, string $source)
    {
        return $query->where('source', $source);
    }
}
