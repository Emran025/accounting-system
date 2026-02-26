<?php

namespace App\Enums;

/**
 * Currency Conversion Timing Enumeration
 * 
 * Defines when currency conversion occurs in the transaction lifecycle.
 * This is a governance decision, not a technical necessity.
 */
enum ConversionTiming: string
{
    /**
     * Conversion at Posting Time
     * 
     * Currency is converted immediately when the transaction is posted to the ledger.
     * This is the traditional approach used by most single-currency accounting systems.
     */
    case POSTING = 'POSTING';

    /**
     * Conversion at Settlement Time
     * 
     * Currency conversion is deferred until the actual financial settlement occurs.
     * The transaction is stored in its original currency until payment/receipt.
     */
    case SETTLEMENT = 'SETTLEMENT';

    /**
     * Conversion at Reporting Time
     * 
     * Currency is stored in its native form. Conversion only occurs for reporting
     * and presentation purposes. The ledger maintains multi-currency balances.
     */
    case REPORTING = 'REPORTING';

    /**
     * Never Convert
     * 
     * Foreign currency amounts are never converted. Each currency maintains
     * its own independent ledger balance. Suitable for Policy Type A.
     */
    case NEVER = 'NEVER';

    public function label(): string
    {
        return match($this) {
            self::POSTING => 'At Posting',
            self::SETTLEMENT => 'At Settlement',
            self::REPORTING => 'For Reporting Only',
            self::NEVER => 'Never',
        };
    }

    public function labelAr(): string
    {
        return match($this) {
            self::POSTING => 'عند الترحيل',
            self::SETTLEMENT => 'عند التسوية',
            self::REPORTING => 'للتقارير فقط',
            self::NEVER => 'لا يتم التحويل',
        };
    }
}
