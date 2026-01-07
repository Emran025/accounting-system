<?php
namespace App\Helpers;

class CurrencyHelper {
    /**
     * Format a number as currency (SAR default)
     */
    public static function format($amount, $currency = 'SAR') {
        return number_format($amount, 2) . ' ' . $currency;
    }

    /**
     * Round amounts for financial calculations (2 decimals standard)
     */
    public static function round($amount) {
        return round($amount, 2);
    }

    /**
     * Calculate tax (VAT 15% in KSA)
     */
    public static function calculateVAT($amount, $rate = 0.15) {
        return self::round($amount * $rate);
    }
}
