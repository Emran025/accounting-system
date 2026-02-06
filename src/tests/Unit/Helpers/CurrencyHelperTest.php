<?php

namespace Tests\Unit\Helpers;

use Tests\TestCase;
use App\Helpers\CurrencyHelper;
use App\Models\Currency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;

class CurrencyHelperTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        $reflection = new \ReflectionClass(CurrencyHelper::class);
        $property = $reflection->getProperty('primaryCurrency');
        $property->setAccessible(true);
        $property->setValue(null);
        
        parent::tearDown();
    }

    public function test_get_primary_currency_returns_primary_currency()
    {
        $primary = Currency::factory()->create(['is_primary' => true, 'code' => 'SAR', 'symbol' => 'ر.س']);
        Currency::factory()->create(['is_primary' => false, 'code' => 'USD']);

        $result = CurrencyHelper::getPrimaryCurrency();

        $this->assertEquals($primary->id, $result->id);
        $this->assertEquals('SAR', $result->code);
    }

    public function test_get_primary_currency_falls_back_if_no_primary_defined()
    {
        $currency = Currency::factory()->create(['is_primary' => false, 'code' => 'USD']);

        $result = CurrencyHelper::getPrimaryCurrency();

        $this->assertEquals($currency->id, $result->id);
    }

    public function test_get_primary_currency_returns_default_object_on_exception()
    {
        // Drop the table to force a QueryException
        \Illuminate\Support\Facades\Schema::drop('currencies');

        // Reset the static property to force a new fetch
        $reflection = new \ReflectionClass(CurrencyHelper::class);
        $property = $reflection->getProperty('primaryCurrency');
        $property->setAccessible(true);
        $property->setValue(null);

        $result = CurrencyHelper::getPrimaryCurrency();

        $this->assertEquals('SAR', $result->code);
        $this->assertEquals('ر.س', $result->symbol);
    }

    public function test_format_currency_with_symbol()
    {
        $this->assertEquals('100.00 $', CurrencyHelper::format(100, '$'));
    }

    public function test_format_currency_uses_primary_symbol_by_default()
    {
        Currency::factory()->create(['is_primary' => true, 'symbol' => 'SAR']);
        
        // Reset static cache
        $reflection = new \ReflectionClass(CurrencyHelper::class);
        $property = $reflection->getProperty('primaryCurrency');
        $property->setAccessible(true);
        $property->setValue(null);

        $this->assertEquals('100.00 SAR', CurrencyHelper::format(100));
    }

    public function test_round_rounds_to_two_decimal_places()
    {
        $this->assertEquals(10.56, CurrencyHelper::round(10.556));
        $this->assertEquals(10.55, CurrencyHelper::round(10.554));
    }

    public function test_calculate_vat_uses_config_rate()
    {
        Config::set('accounting.vat_rate', 0.15);
        $this->assertEquals(15.00, CurrencyHelper::calculateVAT(100));
    }

    public function test_calculate_vat_uses_provided_rate()
    {
        $this->assertEquals(10.00, CurrencyHelper::calculateVAT(100, 0.10));
    }
}
