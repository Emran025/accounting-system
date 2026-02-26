<?php

namespace App\Models;

use App\Enums\ConversionDecision;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Transaction Currency Context Model
 * 
 * Implements Temporal Policy Binding as defined in the Multi-Currency Architecture report.
 * Each transaction carries not only amounts and currencies, but its currency treatment context,
 * ensuring that policy changes do not retroactively alter historical meaning.
 * 
 * @property int $id
 * @property string $transaction_type
 * @property int $transaction_id
 * @property int $currency_policy_id
 * @property int $transaction_currency_id
 * @property float $transaction_amount
 * @property int|null $reference_currency_id
 * @property float|null $exchange_rate_at_posting
 * @property float|null $reference_amount
 * @property bool $converted_at_posting
 * @property ConversionDecision $conversion_decision
 * @property array|null $policy_snapshot
 */
class TransactionCurrencyContext extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_type',
        'transaction_id',
        'currency_policy_id',
        'transaction_currency_id',
        'transaction_amount',
        'reference_currency_id',
        'exchange_rate_at_posting',
        'reference_amount',
        'converted_at_posting',
        'conversion_decision',
        'policy_snapshot',
    ];

    protected $casts = [
        'transaction_amount' => 'decimal:4',
        'exchange_rate_at_posting' => 'decimal:8',
        'reference_amount' => 'decimal:4',
        'converted_at_posting' => 'boolean',
        'conversion_decision' => ConversionDecision::class,
        'policy_snapshot' => 'array',
    ];

    /**
     * Get the currency policy
     */
    public function currencyPolicy(): BelongsTo
    {
        return $this->belongsTo(CurrencyPolicy::class);
    }

    /**
     * Get the transaction currency
     */
    public function transactionCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'transaction_currency_id');
    }

    /**
     * Get the reference currency
     */
    public function referenceCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'reference_currency_id');
    }

    /**
     * Get the owning transaction (polymorphic)
     */
    public function transaction(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'transaction_type', 'transaction_id');
    }

    /**
     * Create a context for a new transaction
     */
    public static function createForTransaction(
        string $transactionType,
        int $transactionId,
        int $transactionCurrencyId,
        float $transactionAmount,
        ?int $referenceCurrencyId = null,
        ?float $exchangeRate = null,
        ConversionDecision $decision = ConversionDecision::POLICY_MANDATED
    ): self {
        $activePolicy = CurrencyPolicy::getActivePolicy();
        
        if (!$activePolicy) {
            throw new \Exception('No active currency policy configured. Cannot process transaction.');
        }

        $referenceAmount = null;
        $convertedAtPosting = false;

        // Determine if conversion should occur
        if ($exchangeRate && $referenceCurrencyId && $decision->involvesConversion()) {
            $referenceAmount = round($transactionAmount * $exchangeRate, 4);
            $convertedAtPosting = true;
        }

        return static::create([
            'transaction_type' => $transactionType,
            'transaction_id' => $transactionId,
            'currency_policy_id' => $activePolicy->id,
            'transaction_currency_id' => $transactionCurrencyId,
            'transaction_amount' => $transactionAmount,
            'reference_currency_id' => $referenceCurrencyId,
            'exchange_rate_at_posting' => $exchangeRate,
            'reference_amount' => $referenceAmount,
            'converted_at_posting' => $convertedAtPosting,
            'conversion_decision' => $decision,
            'policy_snapshot' => $activePolicy->toSnapshot(),
        ]);
    }

    /**
     * Get context for a transaction
     */
    public static function forTransaction(string $transactionType, int $transactionId): ?self
    {
        return static::where('transaction_type', $transactionType)
            ->where('transaction_id', $transactionId)
            ->first();
    }

    /**
     * Get the effective amount based on policy
     * 
     * @param bool $preferReference If true, returns reference amount when available
     * @return float
     */
    public function getEffectiveAmount(bool $preferReference = false): float
    {
        if ($preferReference && $this->converted_at_posting && $this->reference_amount !== null) {
            return (float) $this->reference_amount;
        }
        
        return (float) $this->transaction_amount;
    }

    /**
     * Whether this transaction was converted at posting
     */
    public function wasConverted(): bool
    {
        return $this->converted_at_posting;
    }

    /**
     * Get the policy type that was active for this transaction
     */
    public function getPolicyType(): ?string
    {
        return $this->policy_snapshot['policy_type'] ?? null;
    }
}
