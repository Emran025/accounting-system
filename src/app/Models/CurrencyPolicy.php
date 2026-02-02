<?php

namespace App\Models;

use App\Enums\ConversionTiming;
use App\Enums\CurrencyPolicyType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Currency Policy Model
 * 
 * Represents an organizational currency treatment policy as defined in the
 * Multi-Currency Architecture report. Policy governs how currencies are 
 * processed throughout the transaction lifecycle.
 * 
 * @property int $id
 * @property string $name
 * @property string $code
 * @property string|null $description
 * @property CurrencyPolicyType $policy_type
 * @property bool $requires_reference_currency
 * @property bool $allow_multi_currency_balances
 * @property ConversionTiming $conversion_timing
 * @property bool $revaluation_enabled
 * @property string|null $revaluation_frequency
 * @property string $exchange_rate_source
 * @property bool $is_active
 */
class CurrencyPolicy extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'policy_type',
        'requires_reference_currency',
        'allow_multi_currency_balances',
        'conversion_timing',
        'revaluation_enabled',
        'revaluation_frequency',
        'exchange_rate_source',
        'is_active',
    ];

    protected $casts = [
        'policy_type' => CurrencyPolicyType::class,
        'conversion_timing' => ConversionTiming::class,
        'requires_reference_currency' => 'boolean',
        'allow_multi_currency_balances' => 'boolean',
        'revaluation_enabled' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Get the currently active policy
     */
    public static function getActivePolicy(): ?self
    {
        return static::where('is_active', true)->first();
    }

    /**
     * Activate this policy (and deactivate all others)
     */
    public function activate(): void
    {
        static::query()->update(['is_active' => false]);
        $this->update(['is_active' => true]);
    }

    /**
     * Get transaction contexts using this policy
     */
    public function transactionContexts(): HasMany
    {
        return $this->hasMany(TransactionCurrencyContext::class);
    }

    /**
     * Determine if this policy requires conversion at posting
     */
    public function requiresPostingConversion(): bool
    {
        return $this->policy_type->requiresPostingConversion() 
            && $this->conversion_timing === ConversionTiming::POSTING;
    }

    /**
     * Determine if multi-currency ledger balances are allowed
     */
    public function allowsMultiCurrencyBalances(): bool
    {
        return $this->allow_multi_currency_balances 
            && $this->policy_type->supportsMultiCurrencyBalances();
    }

    /**
     * Get a snapshot of this policy for historical storage
     */
    public function toSnapshot(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'policy_type' => $this->policy_type->value,
            'requires_reference_currency' => $this->requires_reference_currency,
            'allow_multi_currency_balances' => $this->allow_multi_currency_balances,
            'conversion_timing' => $this->conversion_timing->value,
            'revaluation_enabled' => $this->revaluation_enabled,
            'snapshot_at' => now()->toISOString(),
        ];
    }

    /**
     * Scope to find active policies
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to find policies by type
     */
    public function scopeOfType($query, CurrencyPolicyType $type)
    {
        return $query->where('policy_type', $type->value);
    }
}
