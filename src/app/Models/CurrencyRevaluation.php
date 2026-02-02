<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Currency Revaluation Model
 * 
 * Tracks revaluation events for foreign currency balances.
 * Records gains/losses from exchange rate fluctuations.
 * 
 * @property int $id
 * @property int|null $fiscal_period_id
 * @property int $currency_id
 * @property int $account_id
 * @property float $previous_rate
 * @property float $new_rate
 * @property float $foreign_balance
 * @property float $previous_reference_balance
 * @property float $new_reference_balance
 * @property float $revaluation_amount
 * @property string $revaluation_type (GAIN or LOSS)
 * @property string|null $voucher_number
 */
class CurrencyRevaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'fiscal_period_id',
        'currency_id',
        'account_id',
        'previous_rate',
        'new_rate',
        'foreign_balance',
        'previous_reference_balance',
        'new_reference_balance',
        'revaluation_amount',
        'revaluation_type',
        'voucher_number',
        'created_by',
    ];

    protected $casts = [
        'previous_rate' => 'decimal:8',
        'new_rate' => 'decimal:8',
        'foreign_balance' => 'decimal:4',
        'previous_reference_balance' => 'decimal:4',
        'new_reference_balance' => 'decimal:4',
        'revaluation_amount' => 'decimal:4',
    ];

    /**
     * Get the fiscal period
     */
    public function fiscalPeriod(): BelongsTo
    {
        return $this->belongsTo(FiscalPeriod::class);
    }

    /**
     * Get the currency
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Get the account
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    /**
     * Get the user who created this revaluation
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Create a revaluation record
     */
    public static function record(
        int $currencyId,
        int $accountId,
        float $foreignBalance,
        float $previousRate,
        float $newRate,
        ?int $fiscalPeriodId = null,
        ?string $voucherNumber = null
    ): self {
        $previousReferenceBalance = $foreignBalance * $previousRate;
        $newReferenceBalance = $foreignBalance * $newRate;
        $revaluationAmount = abs($newReferenceBalance - $previousReferenceBalance);
        $revaluationType = $newReferenceBalance >= $previousReferenceBalance ? 'GAIN' : 'LOSS';

        return static::create([
            'fiscal_period_id' => $fiscalPeriodId,
            'currency_id' => $currencyId,
            'account_id' => $accountId,
            'previous_rate' => $previousRate,
            'new_rate' => $newRate,
            'foreign_balance' => $foreignBalance,
            'previous_reference_balance' => $previousReferenceBalance,
            'new_reference_balance' => $newReferenceBalance,
            'revaluation_amount' => $revaluationAmount,
            'revaluation_type' => $revaluationType,
            'voucher_number' => $voucherNumber,
            'created_by' => auth()->id(),
        ]);
    }

    /**
     * Check if this is a gain
     */
    public function isGain(): bool
    {
        return $this->revaluation_type === 'GAIN';
    }

    /**
     * Check if this is a loss
     */
    public function isLoss(): bool
    {
        return $this->revaluation_type === 'LOSS';
    }

    /**
     * Get the rate change percentage
     */
    public function getRateChangePercentage(): float
    {
        if ($this->previous_rate == 0) {
            return 0;
        }
        
        return (($this->new_rate - $this->previous_rate) / $this->previous_rate) * 100;
    }

    /**
     * Scope for revaluations in a specific currency
     */
    public function scopeForCurrency($query, int $currencyId)
    {
        return $query->where('currency_id', $currencyId);
    }

    /**
     * Scope for revaluations in a specific period
     */
    public function scopeInPeriod($query, int $fiscalPeriodId)
    {
        return $query->where('fiscal_period_id', $fiscalPeriodId);
    }

    /**
     * Scope for gains only
     */
    public function scopeGains($query)
    {
        return $query->where('revaluation_type', 'GAIN');
    }

    /**
     * Scope for losses only
     */
    public function scopeLosses($query)
    {
        return $query->where('revaluation_type', 'LOSS');
    }
}
