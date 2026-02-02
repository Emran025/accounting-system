<?php

namespace App\Enums;

/**
 * Currency Conversion Decision Enumeration
 * 
 * Captures the rationale for why a specific conversion behavior was applied
 * to a transaction. This is critical for audit trails and understanding
 * historical currency treatment.
 */
enum ConversionDecision: string
{
    /**
     * Conversion was mandated by the active currency policy
     */
    case POLICY_MANDATED = 'POLICY_MANDATED';

    /**
     * User explicitly requested conversion
     */
    case USER_REQUESTED = 'USER_REQUESTED';

    /**
     * No conversion needed - transaction is in the reference currency
     */
    case SAME_CURRENCY = 'SAME_CURRENCY';

    /**
     * Conversion was deferred per policy (Policy A/B)
     */
    case DEFERRED = 'DEFERRED';

    /**
     * Special exemption applied - conversion bypassed
     */
    case EXEMPTED = 'EXEMPTED';

    public function label(): string
    {
        return match($this) {
            self::POLICY_MANDATED => 'Policy Mandated',
            self::USER_REQUESTED => 'User Requested',
            self::SAME_CURRENCY => 'Same Currency',
            self::DEFERRED => 'Deferred',
            self::EXEMPTED => 'Exempted',
        };
    }

    public function labelAr(): string
    {
        return match($this) {
            self::POLICY_MANDATED => 'مطلوب حسب السياسة',
            self::USER_REQUESTED => 'طلب المستخدم',
            self::SAME_CURRENCY => 'نفس العملة',
            self::DEFERRED => 'مؤجل',
            self::EXEMPTED => 'معفى',
        };
    }

    /**
     * Whether this decision results in actual conversion
     */
    public function involvesConversion(): bool
    {
        return match($this) {
            self::POLICY_MANDATED, self::USER_REQUESTED => true,
            self::SAME_CURRENCY, self::DEFERRED, self::EXEMPTED => false,
        };
    }
}
