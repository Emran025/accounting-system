<?php

namespace App\Helpers;

class CurrencyHelper
{
    private static $primaryCurrency = null;

    /**
     * Get the primary currency from the database
     */
    public static function getPrimaryCurrency()
    {
        if (self::$primaryCurrency === null) {
            try {
                self::$primaryCurrency = \App\Models\Currency::where('is_primary', true)->first() 
                    ?? \App\Models\Currency::first();
            } catch (\Exception $e) {
                // Fallback for cases where DB might not be available or model doesn't exist
                return (object)['code' => 'SAR', 'symbol' => 'ر.س'];
            }
        }
        return self::$primaryCurrency;
    }

    /**
     * Format a number as currency
     */
    public static function format($amount, $currency = null): string
    {
        $symbol = $currency;
        
        if ($symbol === null) {
            $primary = self::getPrimaryCurrency();
            $symbol = $primary ? $primary->symbol : 'ر.س';
        }

        return number_format($amount, 2) . ' ' . $symbol;
    }

    /**
     * Round amounts for financial calculations (2 decimals standard)
     */
    public static function round($amount): float
    {
        return round($amount, 2);
    }

    public static function calculateVAT($amount, $rate = null): float
    {
        $taxRate = $rate ?? (float)config('accounting.vat_rate');
        return self::round($amount * $taxRate);
    }
}

