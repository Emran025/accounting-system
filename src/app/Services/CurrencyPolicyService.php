<?php

namespace App\Services;

use App\Enums\ConversionDecision;
use App\Enums\ConversionTiming;
use App\Enums\CurrencyPolicyType;
use App\Models\Currency;
use App\Models\CurrencyExchangeRateHistory;
use App\Models\CurrencyLedgerEntry;
use App\Models\CurrencyPolicy;
use App\Models\CurrencyRevaluation;
use App\Models\TransactionCurrencyContext;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Currency Policy Service
 * 
 * The decision engine for currency treatment as defined in the Multi-Currency
 * Architecture report. This service evaluates currency policy and determines
 * how transactions should be processed based on institutional governance.
 * 
 * Key Responsibilities:
 * - Policy evaluation and decision making
 * - Exchange rate management
 * - Currency conversion (when policy dictates)
 * - Temporal policy binding for transactions
 * - Revaluation processing
 * 
 * @see reports/Multi_Currency_System_Final_Report.md
 */
class CurrencyPolicyService
{
    private ?CurrencyPolicy $activePolicy = null;
    private ?Currency $referenceCurrency = null;

    /**
     * Get the currently active currency policy
     */
    public function getActivePolicy(): ?CurrencyPolicy
    {
        if ($this->activePolicy === null) {
            $this->activePolicy = CurrencyPolicy::getActivePolicy();
        }
        return $this->activePolicy;
    }

    /**
     * Get the reference (base/functional) currency
     */
    public function getReferenceCurrency(): ?Currency
    {
        if ($this->referenceCurrency === null) {
            $this->referenceCurrency = Currency::where('is_primary', true)->first();
        }
        return $this->referenceCurrency;
    }

    /**
     * Determine the conversion decision for a transaction
     * 
     * This is the core decision point that evaluates policy and determines
     * whether conversion should occur.
     * 
     * @param int $transactionCurrencyId The currency of the transaction
     * @param bool $userRequestedConversion Whether user explicitly requested conversion
     * @return ConversionDecision
     */
    public function determineConversionDecision(
        int $transactionCurrencyId,
        bool $userRequestedConversion = false
    ): ConversionDecision {
        $policy = $this->getActivePolicy();
        $referenceCurrency = $this->getReferenceCurrency();

        // If no policy configured, default to normalization behavior
        if (!$policy) {
            Log::warning('CurrencyPolicyService: No active policy configured, defaulting to POLICY_MANDATED');
            return ConversionDecision::POLICY_MANDATED;
        }

        // If transaction is in reference currency, no conversion needed
        if ($referenceCurrency && $transactionCurrencyId === $referenceCurrency->id) {
            return ConversionDecision::SAME_CURRENCY;
        }

        // If user explicitly requested conversion
        if ($userRequestedConversion) {
            return ConversionDecision::USER_REQUESTED;
        }

        // Evaluate based on policy type
        return match ($policy->policy_type) {
            CurrencyPolicyType::NORMALIZATION => ConversionDecision::POLICY_MANDATED,
            CurrencyPolicyType::UNIT_OF_MEASURE => ConversionDecision::DEFERRED,
            CurrencyPolicyType::VALUED_ASSET => $this->evaluateValuedAssetPolicy($policy),
        };
    }

    /**
     * Evaluate conversion decision for Valued Asset policy
     */
    private function evaluateValuedAssetPolicy(CurrencyPolicy $policy): ConversionDecision
    {
        // For valued asset policy, check conversion timing
        return match ($policy->conversion_timing) {
            ConversionTiming::POSTING => ConversionDecision::POLICY_MANDATED,
            ConversionTiming::SETTLEMENT => ConversionDecision::DEFERRED,
            ConversionTiming::REPORTING => ConversionDecision::DEFERRED,
            ConversionTiming::NEVER => ConversionDecision::DEFERRED,
        };
    }

    /**
     * Get the exchange rate for a currency pair
     * 
     * @param int $sourceCurrencyId
     * @param int $targetCurrencyId
     * @param string|null $date Optional date for historical rate
     * @return float|null
     */
    public function getExchangeRate(
        int $sourceCurrencyId,
        int $targetCurrencyId,
        ?string $date = null
    ): ?float {
        // Same currency = rate of 1
        if ($sourceCurrencyId === $targetCurrencyId) {
            return 1.0;
        }

        $date = $date ?? now()->format('Y-m-d');

        // Try historical rate first
        $historicalRate = CurrencyExchangeRateHistory::getRateOnDate(
            $sourceCurrencyId,
            $targetCurrencyId,
            $date
        );

        if ($historicalRate !== null) {
            return $historicalRate;
        }

        // Fall back to current currency exchange_rate field
        $sourceCurrency = Currency::find($sourceCurrencyId);
        $targetCurrency = Currency::find($targetCurrencyId);

        if (!$sourceCurrency || !$targetCurrency) {
            return null;
        }

        // If target is primary (reference), return source's exchange rate
        if ($targetCurrency->is_primary) {
            return (float) $sourceCurrency->exchange_rate;
        }

        // If source is primary, return inverse of target's rate
        if ($sourceCurrency->is_primary && $targetCurrency->exchange_rate > 0) {
            return 1 / (float) $targetCurrency->exchange_rate;
        }

        // Cross-rate calculation: source to primary to target
        if ($sourceCurrency->exchange_rate > 0 && $targetCurrency->exchange_rate > 0) {
            return (float) $sourceCurrency->exchange_rate / (float) $targetCurrency->exchange_rate;
        }

        return null;
    }

    /**
     * Convert an amount from one currency to another
     * 
     * @param float $amount
     * @param int $sourceCurrencyId
     * @param int $targetCurrencyId
     * @param string|null $date
     * @return array ['amount' => float, 'rate' => float]
     */
    public function convert(
        float $amount,
        int $sourceCurrencyId,
        int $targetCurrencyId,
        ?string $date = null
    ): array {
        $rate = $this->getExchangeRate($sourceCurrencyId, $targetCurrencyId, $date);

        if ($rate === null) {
            throw new \Exception("No exchange rate available for currency pair: {$sourceCurrencyId} to {$targetCurrencyId}");
        }

        return [
            'amount' => round($amount * $rate, 4),
            'rate' => $rate,
        ];
    }

    /**
     * Create a currency context for a transaction
     * 
     * This binds the current policy to the transaction, ensuring temporal integrity.
     * 
     * @param string $transactionType e.g., 'invoices', 'purchases'
     * @param int $transactionId
     * @param int $transactionCurrencyId
     * @param float $transactionAmount
     * @param bool $userRequestedConversion
     * @return TransactionCurrencyContext
     */
    public function createTransactionContext(
        string $transactionType,
        int $transactionId,
        int $transactionCurrencyId,
        float $transactionAmount,
        bool $userRequestedConversion = false
    ): TransactionCurrencyContext {
        $referenceCurrency = $this->getReferenceCurrency();
        $decision = $this->determineConversionDecision($transactionCurrencyId, $userRequestedConversion);

        $exchangeRate = null;
        $referenceCurrencyId = $referenceCurrency?->id;

        // Get exchange rate if conversion will be applied
        if ($decision->involvesConversion() && $referenceCurrencyId && $transactionCurrencyId !== $referenceCurrencyId) {
            $exchangeRate = $this->getExchangeRate($transactionCurrencyId, $referenceCurrencyId);
        }

        return TransactionCurrencyContext::createForTransaction(
            $transactionType,
            $transactionId,
            $transactionCurrencyId,
            $transactionAmount,
            $referenceCurrencyId,
            $exchangeRate,
            $decision
        );
    }

    /**
     * Record an exchange rate
     */
    public function recordExchangeRate(
        int $sourceCurrencyId,
        int $targetCurrencyId,
        float $rate,
        ?string $date = null,
        string $source = 'MANUAL',
        ?string $sourceReference = null
    ): CurrencyExchangeRateHistory {
        return CurrencyExchangeRateHistory::recordRate(
            $sourceCurrencyId,
            $targetCurrencyId,
            $rate,
            $date ?? now()->format('Y-m-d'),
            $source,
            $sourceReference
        );
    }

    /**
     * Get the amount to post to ledger based on policy
     * 
     * @param float $originalAmount Amount in transaction currency
     * @param int $transactionCurrencyId
     * @param TransactionCurrencyContext|null $context
     * @return array ['amount' => float, 'currency_id' => int]
     */
    public function getLedgerPostingAmount(
        float $originalAmount,
        int $transactionCurrencyId,
        ?TransactionCurrencyContext $context = null
    ): array {
        $policy = $this->getActivePolicy();
        $referenceCurrency = $this->getReferenceCurrency();

        // If no policy or policy allows multi-currency balances
        if (!$policy || $policy->allowsMultiCurrencyBalances()) {
            return [
                'amount' => $originalAmount,
                'currency_id' => $transactionCurrencyId,
            ];
        }

        // If context exists and was converted
        if ($context && $context->wasConverted() && $context->reference_amount !== null) {
            return [
                'amount' => (float) $context->reference_amount,
                'currency_id' => $context->reference_currency_id,
            ];
        }

        // If same as reference currency
        if ($referenceCurrency && $transactionCurrencyId === $referenceCurrency->id) {
            return [
                'amount' => $originalAmount,
                'currency_id' => $transactionCurrencyId,
            ];
        }

        // Normalization policy - convert now
        if ($policy->requiresPostingConversion() && $referenceCurrency) {
            $converted = $this->convert(
                $originalAmount,
                $transactionCurrencyId,
                $referenceCurrency->id
            );
            return [
                'amount' => $converted['amount'],
                'currency_id' => $referenceCurrency->id,
            ];
        }

        // Default: return original
        return [
            'amount' => $originalAmount,
            'currency_id' => $transactionCurrencyId,
        ];
    }

    /**
     * Process revaluation for a specific currency
     * 
     * @param int $currencyId
     * @param float $newRate
     * @param int|null $fiscalPeriodId
     * @return array Revaluation results
     */
    public function processRevaluation(
        int $currencyId,
        float $newRate,
        ?int $fiscalPeriodId = null
    ): array {
        $policy = $this->getActivePolicy();
        
        if (!$policy || !$policy->revaluation_enabled) {
            throw new \Exception('Revaluation is not enabled in the current policy');
        }

        $referenceCurrency = $this->getReferenceCurrency();
        if (!$referenceCurrency) {
            throw new \Exception('No reference currency configured for revaluation');
        }

        // Get previous rate
        $previousRate = $this->getExchangeRate($currencyId, $referenceCurrency->id);
        if ($previousRate === null) {
            $previousRate = 1.0;
        }

        // Get all accounts with balances in this currency
        $balances = $this->getForeignCurrencyBalances($currencyId);

        $revaluations = [];
        $totalGain = 0;
        $totalLoss = 0;

        DB::beginTransaction();
        try {
            foreach ($balances as $balance) {
                if ($balance['foreign_balance'] == 0) {
                    continue;
                }

                $revaluation = CurrencyRevaluation::record(
                    $currencyId,
                    $balance['account_id'],
                    $balance['foreign_balance'],
                    $previousRate,
                    $newRate,
                    $fiscalPeriodId
                );

                $revaluations[] = $revaluation;

                if ($revaluation->isGain()) {
                    $totalGain += $revaluation->revaluation_amount;
                } else {
                    $totalLoss += $revaluation->revaluation_amount;
                }
            }

            // Record the new rate
            $this->recordExchangeRate($currencyId, $referenceCurrency->id, $newRate, null, 'SYSTEM', 'REVALUATION');

            DB::commit();

            return [
                'success' => true,
                'revaluations' => $revaluations,
                'total_gain' => $totalGain,
                'total_loss' => $totalLoss,
                'net_effect' => $totalGain - $totalLoss,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Get foreign currency balances by account
     */
    private function getForeignCurrencyBalances(int $currencyId): array
    {
        return CurrencyLedgerEntry::where('currency_id', $currencyId)
            ->join('general_ledger', 'currency_ledger_entries.general_ledger_id', '=', 'general_ledger.id')
            ->where('general_ledger.is_closed', false)
            ->selectRaw('
                general_ledger.account_id,
                SUM(CASE WHEN general_ledger.entry_type = "DEBIT" THEN currency_ledger_entries.original_amount ELSE 0 END) -
                SUM(CASE WHEN general_ledger.entry_type = "CREDIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as foreign_balance
            ')
            ->groupBy('general_ledger.account_id')
            ->get()
            ->toArray();
    }

    /**
     * Check if the current policy requires conversion at posting
     */
    public function requiresPostingConversion(): bool
    {
        $policy = $this->getActivePolicy();
        return $policy && $policy->requiresPostingConversion();
    }

    /**
     * Check if multi-currency ledger balances are allowed
     */
    public function allowsMultiCurrencyBalances(): bool
    {
        $policy = $this->getActivePolicy();
        return $policy && $policy->allowsMultiCurrencyBalances();
    }

    /**
     * Get policy status for display
     */
    public function getPolicyStatus(): array
    {
        $policy = $this->getActivePolicy();
        $referenceCurrency = $this->getReferenceCurrency();

        return [
            'has_active_policy' => $policy !== null,
            'policy_name' => $policy?->name,
            'policy_type' => $policy?->policy_type?->value,
            'policy_type_label' => $policy?->policy_type?->label(),
            'conversion_timing' => $policy?->conversion_timing?->value,
            'requires_posting_conversion' => $this->requiresPostingConversion(),
            'allows_multi_currency_balances' => $this->allowsMultiCurrencyBalances(),
            'revaluation_enabled' => $policy?->revaluation_enabled ?? false,
            'reference_currency' => $referenceCurrency ? [
                'id' => $referenceCurrency->id,
                'code' => $referenceCurrency->code,
                'name' => $referenceCurrency->name,
                'symbol' => $referenceCurrency->symbol,
            ] : null,
        ];
    }
}
