<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Currency;
use App\Models\CurrencyPolicy;
use App\Models\CurrencyExchangeRateHistory;
use App\Services\CurrencyPolicyService;
use App\Enums\ConversionDecision;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CurrencyPolicyServiceTest extends TestCase
{
    use RefreshDatabase;

    private CurrencyPolicyService $service;
    private Currency $baseCurrency;
    private Currency $foreignCurrency;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CurrencyPolicyService();

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
    }

    public function test_get_reference_currency()
    {
        $currency = $this->service->getReferenceCurrency();

        $this->assertNotNull($currency);
        $this->assertTrue($currency->is_primary);
    }

    public function test_get_active_policy()
    {
        CurrencyPolicy::factory()->create([
            'is_active' => true,
        ]);

        $policy = $this->service->getActivePolicy();

        $this->assertNotNull($policy);
        $this->assertTrue($policy->is_active);
    }

    public function test_record_exchange_rate()
    {
        $this->service->recordExchangeRate(
            $this->foreignCurrency->id,
            $this->baseCurrency->id,
            3.75,
            now()->toDateString(),
            'MANUAL'
        );

        $this->assertDatabaseHas('currency_exchange_rate_history', [
            'currency_id' => $this->foreignCurrency->id,
            'target_currency_id' => $this->baseCurrency->id,
            'exchange_rate' => 3.75,
        ]);
    }

    public function test_get_exchange_rate()
    {
        CurrencyExchangeRateHistory::create([
            'currency_id' => $this->foreignCurrency->id,
            'target_currency_id' => $this->baseCurrency->id,
            'exchange_rate' => 3.75,
            'effective_date' => now()->toDateString(),
            'source' => 'MANUAL',
        ]);

        $rate = $this->service->getExchangeRate(
            $this->foreignCurrency->id,
            $this->baseCurrency->id
        );

        $this->assertEquals(3.75, $rate);
    }

    public function test_convert_amount()
    {
        CurrencyExchangeRateHistory::create([
            'currency_id' => $this->foreignCurrency->id,
            'target_currency_id' => $this->baseCurrency->id,
            'exchange_rate' => 3.75,
            'effective_date' => now()->toDateString(),
            'source' => 'MANUAL',
        ]);

        $result = $this->service->convert(
            100.00,
            $this->foreignCurrency->id,
            $this->baseCurrency->id
        );

        $this->assertArrayHasKey('amount', $result);
        $this->assertArrayHasKey('rate', $result);
        $this->assertEquals(375.00, $result['amount']);
    }

    public function test_same_currency_returns_same_currency_decision()
    {
        $decision = $this->service->determineConversionDecision(
            $this->baseCurrency->id
        );

        $this->assertEquals(ConversionDecision::SAME_CURRENCY, $decision);
    }

    public function test_requires_posting_conversion()
    {
        CurrencyPolicy::factory()->active()->create([
            'policy_type' => 'NORMALIZATION',
            'conversion_timing' => 'POSTING',
        ]);

        $result = $this->service->requiresPostingConversion();

        $this->assertTrue($result);
    }

    public function test_get_policy_status()
    {
        CurrencyPolicy::factory()->create([
            'is_active' => true,
        ]);

        $status = $this->service->getPolicyStatus();

        $this->assertArrayHasKey('has_active_policy', $status);
        $this->assertTrue($status['has_active_policy']);
    }
}
