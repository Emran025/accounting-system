<?php

namespace Database\Seeders;

use App\Models\CurrencyPolicy;
use Illuminate\Database\Seeder;

/**
 * Currency Policy Seeder
 * 
 * Seeds the three standard currency policies as defined in the
 * Multi-Currency Architecture report. Organizations can then
 * activate the policy that matches their operational model.
 */
class CurrencyPolicySeeder extends Seeder
{
    public function run(): void
    {
        // Policy Type C: Normalization (Default for most organizations)
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_C'],
            [
                'name' => 'Standard Normalization',
                'code' => 'POLICY_C',
                'description' => 'Default policy for organizations primarily operating in a single currency. ' .
                    'All foreign currency transactions are immediately converted to the reference currency at posting time. ' .
                    'This is the traditional accounting model used by most domestic businesses.',
                'policy_type' => 'NORMALIZATION',
                'requires_reference_currency' => true,
                'allow_multi_currency_balances' => false,
                'conversion_timing' => 'POSTING',
                'revaluation_enabled' => false,
                'revaluation_frequency' => null,
                'exchange_rate_source' => 'MANUAL',
                'is_active' => true, // Set as default active policy
            ]
        );

        // Policy Type A: Unit of Measure
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_A'],
            [
                'name' => 'Multi-Currency Unit of Measure',
                'code' => 'POLICY_A',
                'description' => 'For organizations that actively hold and operate in multiple currencies. ' .
                    'Each currency is treated as an independent unit of measure. No automatic conversion occurs. ' .
                    'Ledger balances are maintained separately per currency. Ideal for import/export businesses, ' .
                    'forex dealers, or environments with currency scarcity.',
                'policy_type' => 'UNIT_OF_MEASURE',
                'requires_reference_currency' => false,
                'allow_multi_currency_balances' => true,
                'conversion_timing' => 'NEVER',
                'revaluation_enabled' => false,
                'revaluation_frequency' => null,
                'exchange_rate_source' => 'MANUAL',
                'is_active' => false,
            ]
        );

        // Policy Type B: Valued Asset
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_B'],
            [
                'name' => 'Valued Asset with Revaluation',
                'code' => 'POLICY_B',
                'description' => 'For organizations with significant foreign currency exposure requiring periodic revaluation. ' .
                    'Original currency amounts are preserved, with optional conversion. Foreign currency balances are ' .
                    'periodically revalued to reflect exchange rate changes, recognizing gains/losses. ' .
                    'Suitable for businesses with substantial foreign currency receivables or payables.',
                'policy_type' => 'VALUED_ASSET',
                'requires_reference_currency' => true,
                'allow_multi_currency_balances' => true,
                'conversion_timing' => 'SETTLEMENT',
                'revaluation_enabled' => true,
                'revaluation_frequency' => 'PERIOD_END',
                'exchange_rate_source' => 'MANUAL',
                'is_active' => false,
            ]
        );

        // Hybrid Policy for international operations
        CurrencyPolicy::updateOrCreate(
            ['code' => 'POLICY_HYBRID'],
            [
                'name' => 'Hybrid International Operations',
                'code' => 'POLICY_HYBRID',
                'description' => 'For multinational operations requiring both normalized reporting and multi-currency tracking. ' .
                    'Transactions are stored in original currency with immediate conversion for reporting. ' .
                    'Supports both operational currency management and consolidated financial statements.',
                'policy_type' => 'VALUED_ASSET',
                'requires_reference_currency' => true,
                'allow_multi_currency_balances' => true,
                'conversion_timing' => 'POSTING',
                'revaluation_enabled' => true,
                'revaluation_frequency' => 'MONTHLY',
                'exchange_rate_source' => 'MANUAL',
                'is_active' => false,
            ]
        );

        $this->command->info('Currency policies seeded successfully.');
        $this->command->info('Active policy: Standard Normalization (POLICY_C)');
    }
}
