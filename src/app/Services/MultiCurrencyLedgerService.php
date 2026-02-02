<?php

namespace App\Services;

use App\Enums\ConversionDecision;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\CurrencyLedgerEntry;
use App\Models\DocumentSequence;
use App\Models\FiscalPeriod;
use App\Models\GeneralLedger;
use App\Models\TransactionCurrencyContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Multi-Currency Ledger Service
 * 
 * Extends the base LedgerService with multi-currency capabilities
 * as defined in the Multi-Currency Architecture report.
 * 
 * Key Capabilities:
 * - Multi-currency transaction posting
 * - Currency context binding
 * - Multi-currency balance tracking
 * - Foreign currency account balances
 * 
 * @see reports/Multi_Currency_System_Final_Report.md
 */
class MultiCurrencyLedgerService
{
    private LedgerService $ledgerService;
    private CurrencyPolicyService $policyService;

    public function __construct(
        LedgerService $ledgerService,
        CurrencyPolicyService $policyService
    ) {
        $this->ledgerService = $ledgerService;
        $this->policyService = $policyService;
    }

    /**
     * Post a multi-currency transaction
     * 
     * This method handles transactions with currency context,
     * applying the active policy's rules for conversion.
     * 
     * @param array $entries Array of entries with optional currency info
     * @param string|null $referenceType e.g., 'invoices', 'purchases'
     * @param int|null $referenceId
     * @param string|null $voucherNumber
     * @param string|null $voucherDate
     * @param int|null $transactionCurrencyId Currency of the source transaction
     * @param float|null $transactionAmount Total transaction amount
     * @return array ['voucher_number' => string, 'currency_context' => TransactionCurrencyContext|null]
     */
    public function postMultiCurrencyTransaction(
        array $entries,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $voucherNumber = null,
        ?string $voucherDate = null,
        ?int $transactionCurrencyId = null,
        ?float $transactionAmount = null
    ): array {
        return DB::transaction(function () use (
            $entries, $referenceType, $referenceId, 
            $voucherNumber, $voucherDate, 
            $transactionCurrencyId, $transactionAmount
        ) {
            $referenceCurrency = $this->policyService->getReferenceCurrency();
            $referenceCurrencyId = $referenceCurrency?->id;

            // If no transaction currency specified, use reference currency
            $currencyId = $transactionCurrencyId ?? $referenceCurrencyId;
            
            // Determine conversion decision
            $conversionDecision = ConversionDecision::SAME_CURRENCY;
            if ($currencyId && $currencyId !== $referenceCurrencyId) {
                $conversionDecision = $this->policyService->determineConversionDecision($currencyId);
            }

            // Process entries based on policy
            $processedEntries = [];
            $currencyEntryMapping = [];

            foreach ($entries as $index => $entry) {
                $entryCurrencyId = $entry['currency_id'] ?? $currencyId ?? $referenceCurrencyId;
                $originalAmount = (float) $entry['amount'];
                
                // Get the posting amount based on policy
                $postingData = $this->policyService->getLedgerPostingAmount(
                    $originalAmount,
                    $entryCurrencyId
                );

                $processedEntry = [
                    'account_code' => $entry['account_code'],
                    'entry_type' => $entry['entry_type'],
                    'amount' => $postingData['amount'],
                    'description' => $entry['description'] ?? '',
                ];

                $processedEntries[] = $processedEntry;

                // Track original currency info for currency ledger entries
                $currencyEntryMapping[$index] = [
                    'original_currency_id' => $entryCurrencyId,
                    'original_amount' => $originalAmount,
                    'posted_currency_id' => $postingData['currency_id'],
                    'posted_amount' => $postingData['amount'],
                    'exchange_rate' => null,
                ];

                // Calculate exchange rate if currencies differ
                if ($entryCurrencyId !== $postingData['currency_id']) {
                    $rate = $this->policyService->getExchangeRate(
                        $entryCurrencyId,
                        $postingData['currency_id']
                    );
                    $currencyEntryMapping[$index]['exchange_rate'] = $rate;
                }
            }

            // Post to base ledger
            $resultVoucherNumber = $this->ledgerService->postTransaction(
                $processedEntries,
                $referenceType,
                $referenceId,
                $voucherNumber,
                $voucherDate
            );

            // Create currency ledger entries if multi-currency balances are allowed
            if ($this->policyService->allowsMultiCurrencyBalances()) {
                $this->createCurrencyLedgerEntries(
                    $resultVoucherNumber,
                    $currencyEntryMapping
                );
            }

            // Create transaction currency context if this is a tracked transaction
            $currencyContext = null;
            if ($referenceType && $referenceId && $currencyId) {
                $currencyContext = $this->policyService->createTransactionContext(
                    $referenceType,
                    $referenceId,
                    $currencyId,
                    $transactionAmount ?? array_sum(array_column($entries, 'amount')) / 2
                );
            }

            return [
                'voucher_number' => $resultVoucherNumber,
                'currency_context' => $currencyContext,
            ];
        });
    }

    /**
     * Create currency ledger entries for tracking original currencies
     */
    private function createCurrencyLedgerEntries(
        string $voucherNumber,
        array $currencyEntryMapping
    ): void {
        $ledgerEntries = GeneralLedger::where('voucher_number', $voucherNumber)
            ->orderBy('id')
            ->get();

        foreach ($ledgerEntries as $index => $ledgerEntry) {
            if (!isset($currencyEntryMapping[$index])) {
                continue;
            }

            $mapping = $currencyEntryMapping[$index];

            CurrencyLedgerEntry::createForLedgerEntry(
                $ledgerEntry->id,
                $mapping['original_currency_id'],
                $mapping['original_amount'],
                $mapping['exchange_rate'],
                $mapping['posted_amount']
            );
        }
    }

    /**
     * Get account balance in a specific currency
     * 
     * @param string $accountCode
     * @param int $currencyId
     * @param string|null $asOfDate
     * @return float
     */
    public function getAccountBalanceInCurrency(
        string $accountCode,
        int $currencyId,
        ?string $asOfDate = null
    ): float {
        $account = ChartOfAccount::where('account_code', $accountCode)->first();
        
        if (!$account) {
            return 0;
        }

        $query = CurrencyLedgerEntry::where('currency_id', $currencyId)
            ->join('general_ledger', 'currency_ledger_entries.general_ledger_id', '=', 'general_ledger.id')
            ->where('general_ledger.account_id', $account->id)
            ->where('general_ledger.is_closed', false);

        if ($asOfDate) {
            $query->where('general_ledger.voucher_date', '<=', $asOfDate);
        }

        $totals = $query->selectRaw('
            SUM(CASE WHEN general_ledger.entry_type = "DEBIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as total_debits,
            SUM(CASE WHEN general_ledger.entry_type = "CREDIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as total_credits
        ')->first();

        $debits = (float) ($totals->total_debits ?? 0);
        $credits = (float) ($totals->total_credits ?? 0);

        // Asset and Expense accounts have debit balances
        if (in_array($account->account_type, ['Asset', 'Expense'])) {
            return $debits - $credits;
        }
        
        // Liability, Equity, and Revenue accounts have credit balances
        return $credits - $debits;
    }

    /**
     * Get all currency balances for an account
     * 
     * @param string $accountCode
     * @param string|null $asOfDate
     * @return array
     */
    public function getAccountCurrencyBalances(
        string $accountCode,
        ?string $asOfDate = null
    ): array {
        $account = ChartOfAccount::where('account_code', $accountCode)->first();
        
        if (!$account) {
            return [];
        }

        $query = CurrencyLedgerEntry::join('general_ledger', 'currency_ledger_entries.general_ledger_id', '=', 'general_ledger.id')
            ->join('currencies', 'currency_ledger_entries.currency_id', '=', 'currencies.id')
            ->where('general_ledger.account_id', $account->id)
            ->where('general_ledger.is_closed', false);

        if ($asOfDate) {
            $query->where('general_ledger.voucher_date', '<=', $asOfDate);
        }

        $results = $query->selectRaw('
            currency_ledger_entries.currency_id,
            currencies.code as currency_code,
            currencies.symbol as currency_symbol,
            currencies.name as currency_name,
            SUM(CASE WHEN general_ledger.entry_type = "DEBIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as total_debits,
            SUM(CASE WHEN general_ledger.entry_type = "CREDIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as total_credits
        ')
        ->groupBy('currency_ledger_entries.currency_id', 'currencies.code', 'currencies.symbol', 'currencies.name')
        ->get();

        $balances = [];
        foreach ($results as $result) {
            $debits = (float) $result->total_debits;
            $credits = (float) $result->total_credits;

            // Calculate balance based on account type
            $balance = in_array($account->account_type, ['Asset', 'Expense'])
                ? $debits - $credits
                : $credits - $debits;

            if ($balance != 0) {
                $balances[] = [
                    'currency_id' => $result->currency_id,
                    'currency_code' => $result->currency_code,
                    'currency_symbol' => $result->currency_symbol,
                    'currency_name' => $result->currency_name,
                    'balance' => $balance,
                    'debits' => $debits,
                    'credits' => $credits,
                ];
            }
        }

        return $balances;
    }

    /**
     * Get multi-currency trial balance
     * 
     * @param int|null $currencyId Filter by specific currency (null for all)
     * @param string|null $asOfDate
     * @return array
     */
    public function getMultiCurrencyTrialBalance(
        ?int $currencyId = null,
        ?string $asOfDate = null
    ): array {
        $query = CurrencyLedgerEntry::join('general_ledger', 'currency_ledger_entries.general_ledger_id', '=', 'general_ledger.id')
            ->join('chart_of_accounts', 'general_ledger.account_id', '=', 'chart_of_accounts.id')
            ->join('currencies', 'currency_ledger_entries.currency_id', '=', 'currencies.id')
            ->where('general_ledger.is_closed', false)
            ->where('chart_of_accounts.is_active', true);

        if ($currencyId) {
            $query->where('currency_ledger_entries.currency_id', $currencyId);
        }

        if ($asOfDate) {
            $query->where('general_ledger.voucher_date', '<=', $asOfDate);
        }

        $results = $query->selectRaw('
            currencies.id as currency_id,
            currencies.code as currency_code,
            chart_of_accounts.account_code,
            chart_of_accounts.account_name,
            chart_of_accounts.account_type,
            SUM(CASE WHEN general_ledger.entry_type = "DEBIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as debits,
            SUM(CASE WHEN general_ledger.entry_type = "CREDIT" THEN currency_ledger_entries.original_amount ELSE 0 END) as credits
        ')
        ->groupBy(
            'currencies.id', 'currencies.code',
            'chart_of_accounts.account_code', 'chart_of_accounts.account_name', 'chart_of_accounts.account_type'
        )
        ->orderBy('currencies.code')
        ->orderBy('chart_of_accounts.account_code')
        ->get();

        // Group by currency
        $trialBalance = [];
        foreach ($results as $result) {
            $currencyCode = $result->currency_code;
            
            if (!isset($trialBalance[$currencyCode])) {
                $trialBalance[$currencyCode] = [
                    'currency_id' => $result->currency_id,
                    'currency_code' => $currencyCode,
                    'accounts' => [],
                    'total_debits' => 0,
                    'total_credits' => 0,
                ];
            }

            $debits = (float) $result->debits;
            $credits = (float) $result->credits;

            // Calculate balance based on account type
            $debitBalance = 0;
            $creditBalance = 0;

            if (in_array($result->account_type, ['Asset', 'Expense'])) {
                $balance = $debits - $credits;
                if ($balance > 0) {
                    $debitBalance = $balance;
                } else {
                    $creditBalance = abs($balance);
                }
            } else {
                $balance = $credits - $debits;
                if ($balance > 0) {
                    $creditBalance = $balance;
                } else {
                    $debitBalance = abs($balance);
                }
            }

            if ($debits > 0 || $credits > 0) {
                $trialBalance[$currencyCode]['accounts'][] = [
                    'account_code' => $result->account_code,
                    'account_name' => $result->account_name,
                    'account_type' => $result->account_type,
                    'debit_balance' => $debitBalance,
                    'credit_balance' => $creditBalance,
                ];

                $trialBalance[$currencyCode]['total_debits'] += $debitBalance;
                $trialBalance[$currencyCode]['total_credits'] += $creditBalance;
            }
        }

        // Add is_balanced flag
        foreach ($trialBalance as &$currencyData) {
            $currencyData['is_balanced'] = abs(
                $currencyData['total_debits'] - $currencyData['total_credits']
            ) < 0.01;
        }

        return array_values($trialBalance);
    }

    /**
     * Get reference to base ledger service
     */
    public function getBaseLedgerService(): LedgerService
    {
        return $this->ledgerService;
    }

    /**
     * Get reference to policy service
     */
    public function getPolicyService(): CurrencyPolicyService
    {
        return $this->policyService;
    }
}
