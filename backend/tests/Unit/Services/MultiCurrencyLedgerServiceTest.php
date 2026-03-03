<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Currency;
use App\Models\CurrencyPolicy;
use App\Models\CurrencyExchangeRateHistory;
use App\Models\FiscalPeriod;
use App\Services\MultiCurrencyLedgerService;
use App\Services\LedgerService;
use App\Services\CurrencyPolicyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class MultiCurrencyLedgerServiceTest extends TestCase
{
    use RefreshDatabase;

    private MultiCurrencyLedgerService $service;
    private Currency $baseCurrency;
    private Currency $foreignCurrency;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedChartOfAccounts();

        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);

        $this->baseCurrency = Currency::factory()->create([
            'code' => 'SAR',
            'name' => 'Saudi Riyal',
            'symbol' => 'ر.س',
            'exchange_rate' => 1.00,
            'is_primary' => true,
            'is_active' => true,
        ]);

        $this->foreignCurrency = Currency::factory()->create([
            'code' => 'USD',
            'name' => 'US Dollar',
            'symbol' => '$',
            'exchange_rate' => 3.75,
            'is_primary' => false,
            'is_active' => true,
        ]);

        // Set up exchange rate
        CurrencyExchangeRateHistory::create([
            'currency_id' => $this->foreignCurrency->id,
            'target_currency_id' => $this->baseCurrency->id,
            'exchange_rate' => 3.75,
            'effective_date' => now()->toDateString(),
            'source' => 'MANUAL',
        ]);

        // Create active policy
        CurrencyPolicy::factory()->active()->create([
            'policy_type' => 'NORMALIZATION',
        ]);

        $this->service = app(MultiCurrencyLedgerService::class);
    }

    public function test_can_post_base_currency_transaction()
    {
        $entries = [
            [
                'account_code' => '1110', // Cash
                'entry_type' => 'DEBIT',
                'amount' => 1000.00,
                'description' => 'Test debit',
            ],
            [
                'account_code' => '4100', // Sales Revenue
                'entry_type' => 'CREDIT',
                'amount' => 1000.00,
                'description' => 'Test credit',
            ],
        ];

        $voucherNumber = $this->service->postMultiCurrencyTransaction(
            $entries,
            'test',
            null,
            null,
            now()->toDateString(),
            $this->baseCurrency->id,
            1000.00
        );

        $this->assertNotNull($voucherNumber);

        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $voucherNumber,
            'entry_type' => 'DEBIT',
            'amount' => 1000.00,
        ]);
    }

    public function test_get_base_ledger_service()
    {
        $baseLedger = $this->service->getBaseLedgerService();

        $this->assertInstanceOf(LedgerService::class, $baseLedger);
    }

    public function test_get_policy_service()
    {
        $policyService = $this->service->getPolicyService();

        $this->assertInstanceOf(CurrencyPolicyService::class, $policyService);
    }
}
