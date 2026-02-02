<?php

namespace App\Enums;

/**
 * Currency Policy Type Enumeration
 * 
 * Defines the three distinct currency treatment models as outlined in the
 * Multi-Currency Architecture report. Each policy type determines how
 * foreign currencies are handled throughout the transaction lifecycle.
 * 
 * @see reports/Multi_Currency_System_Final_Report.md Section 3
 */
enum CurrencyPolicyType: string
{
    /**
     * Policy Type A: Currency as a Unit of Measure (Non-Converted)
     * 
     * In this policy:
     * - Currencies are treated as independent units of measure
     * - Amounts are stored and accumulated strictly in their native currency
     * - No conversion is implied at posting time
     * - Ledger balances may exist independently per currency
     * - Conversion, if it occurs, is an explicit downstream event (settlement, exchange)
     * 
     * Suitable when:
     * - Organization actively holds foreign currencies
     * - Local currency is scarce or economically unstable
     * - Foreign currencies represent operational reality rather than exposure
     */
    case UNIT_OF_MEASURE = 'UNIT_OF_MEASURE';

    /**
     * Policy Type B: Currency as a Valued Asset (Conditionally Convertible)
     * 
     * In this policy:
     * - Foreign currencies are recognized as assets/liabilities whose valuation may change
     * - Original currency amounts remain authoritative
     * - Conversion is optional and policy-driven
     * - Revaluation is applied only if the institution defines it as necessary
     * 
     * Suitable when:
     * - Foreign currency exposure is relevant but not always actionable
     * - Valuation is required for specific periods or reports, not continuously
     */
    case VALUED_ASSET = 'VALUED_ASSET';

    /**
     * Policy Type C: Currency Normalization (Immediate Conversion)
     * 
     * In this policy:
     * - Conversion occurs at the point defined by policy (often posting)
     * - The system intentionally prioritizes a single reference currency
     * - All ledger entries are normalized to the reference currency
     * 
     * Suitable when:
     * - Domestic institutions with minimal foreign currency interaction
     * - Regulatory environments that mandate immediate normalization
     */
    case NORMALIZATION = 'NORMALIZATION';

    /**
     * Get human-readable label for the policy type
     */
    public function label(): string
    {
        return match($this) {
            self::UNIT_OF_MEASURE => 'Unit of Measure (Non-Converted)',
            self::VALUED_ASSET => 'Valued Asset (Conditionally Convertible)',
            self::NORMALIZATION => 'Normalization (Immediate Conversion)',
        };
    }

    /**
     * Get Arabic label for the policy type
     */
    public function labelAr(): string
    {
        return match($this) {
            self::UNIT_OF_MEASURE => 'وحدة قياس (بدون تحويل)',
            self::VALUED_ASSET => 'أصل مُقيَّم (قابل للتحويل اختياريًا)',
            self::NORMALIZATION => 'توحيد العملة (تحويل فوري)',
        };
    }

    /**
     * Get detailed description for the policy type
     */
    public function description(): string
    {
        return match($this) {
            self::UNIT_OF_MEASURE => 'Currencies are stored in their native denomination. No conversion occurs at posting. Suitable for organizations that actively hold multiple currencies.',
            self::VALUED_ASSET => 'Currencies are tracked in original amounts with optional revaluation. Conversion is conditional and may be deferred until settlement.',
            self::NORMALIZATION => 'All transactions are immediately converted to the reference currency at posting time. Traditional single-currency accounting model.',
        };
    }

    /**
     * Whether this policy type requires conversion at posting
     */
    public function requiresPostingConversion(): bool
    {
        return match($this) {
            self::UNIT_OF_MEASURE => false,
            self::VALUED_ASSET => false, // Optional, not required
            self::NORMALIZATION => true,
        };
    }

    /**
     * Whether this policy supports multi-currency balances
     */
    public function supportsMultiCurrencyBalances(): bool
    {
        return match($this) {
            self::UNIT_OF_MEASURE => true,
            self::VALUED_ASSET => true,
            self::NORMALIZATION => false,
        };
    }

    /**
     * Whether revaluation is typically enabled for this policy
     */
    public function typicallyRequiresRevaluation(): bool
    {
        return match($this) {
            self::UNIT_OF_MEASURE => false, // Not typically - currencies are units
            self::VALUED_ASSET => true,     // Yes - currencies are valued assets
            self::NORMALIZATION => false,   // No - already normalized
        };
    }
}
