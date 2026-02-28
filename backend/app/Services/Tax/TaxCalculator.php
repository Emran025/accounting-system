<?php

namespace App\Services\Tax;

use App\Models\TaxAuthority;
use App\Models\TaxLine;
use App\Models\TaxRate;
use App\Models\TaxType;
use Illuminate\Support\Facades\DB;

/**
 * Tax calculation service - all tax logic lives here, not in transaction models.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxCalculator
{
    /**
     * Calculate tax for a taxable amount using configured authorities.
     *
     * @param float $taxableAmount Amount to tax (after discounts)
     * @param string $countryCode e.g. SA, AE
     * @param \DateTimeInterface|null $asOf Effective date for rate lookup
     * @param string $taxableType e.g. invoices, purchases
     * @param int|null $taxableId For persisting tax lines (optional)
     * @return TaxCalculationResult
     */
    public function calculate(
        float $taxableAmount,
        string $countryCode = 'SA',
        ?\DateTimeInterface $asOf = null,
        string $taxableType = '',
        ?int $taxableId = null,
        string $applicableArea = 'sales'
    ): TaxCalculationResult {
        $result = new TaxCalculationResult();
        $asOf = $asOf ?? now();
        $date = $asOf->format('Y-m-d');

        $authority = TaxAuthority::getPrimaryForCountry($countryCode);
        if (!$authority) {
            // Fallback: use config-based VAT (backward compatibility)
            return $this->calculateLegacy($taxableAmount);
        }

        $taxTypes = $authority->taxTypes()->where('is_active', true)->get();

        foreach ($taxTypes as $taxType) {
            $areas = $taxType->applicable_areas;
            if (is_string($areas)) {
                $areas = json_decode($areas, true);
            }
            if (!empty($areas) && !in_array($applicableArea, (array)$areas)) {
                continue;
            }

            $taxRate = $taxType->taxRates()
                ->where('effective_from', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('effective_to')->orWhere('effective_to', '>=', $date);
                })
                ->orderByDesc('effective_from')
                ->first();
                
            if (!$taxRate) {
                $taxRate = $taxType->taxRates()->where('is_default', true)->first();
            }

            if (!$taxRate) {
                continue; // No valid rate definition found
            }

            $rateVal = 0;
            $taxAmount = 0;

            if ($taxType->calculation_type === 'percentage') {
                $rateVal = (float)$taxRate->rate;
                $taxAmount = round($taxableAmount * $rateVal, 4);
            } elseif ($taxType->calculation_type === 'fixed_amount') {
                $taxAmount = (float)$taxRate->fixed_amount;
                $rateVal = 0;
            }

            if ($taxAmount > 0 || $rateVal === 0.0) {
                $result->addLine(
                    $rateVal,
                    $taxableAmount,
                    $taxAmount,
                    $taxType->code,
                    $authority->code,
                    $authority->id,
                    $taxType->id,
                    $taxRate->id,
                    [],
                    $taxType->gl_account_code,
                    $taxType->name
                );
            }
        }

        if ($taxableId && $taxableType && !empty($result->lines)) {
            // $taxableType can be class name (App\Models\Invoice) or table name (invoices)
            $this->persistTaxLines($result, $taxableType, $taxableId);
        }

        return $result;
    }

    /**
     * Legacy calculation using config('accounting.vat_rate').
     */
    public function calculateLegacy(float $taxableAmount): TaxCalculationResult
    {
        $result = new TaxCalculationResult();
        $rate = (float) config('accounting.vat_rate', 0.15);
        $taxAmount = round($taxableAmount * $rate, 2);
        $result->addLine($rate, $taxableAmount, $taxAmount, 'VAT', 'LEGACY', 0, 0, null, [], config('accounting.chart_of_accounts.output_vat'), 'VAT (Legacy)');
        return $result;
    }

    /**
     * Persist tax lines for audit trail.
     */
    public function persistTaxLines(TaxCalculationResult $result, string $taxableType, int $taxableId): void
    {
        $order = 0;
        foreach ($result->lines as $line) {
            if ($line['tax_authority_id'] > 0 && $line['tax_type_id'] > 0) {
                TaxLine::create([
                    'taxable_type' => $taxableType,
                    'taxable_id' => $taxableId,
                    'tax_authority_id' => $line['tax_authority_id'],
                    'tax_type_id' => $line['tax_type_id'],
                    'tax_rate_id' => $line['tax_rate_id'],
                    'rate' => $line['rate'],
                    'taxable_amount' => $line['taxable_amount'],
                    'tax_amount' => $line['tax_amount'],
                    'tax_type_code' => $line['tax_type_code'],
                    'tax_authority_code' => $line['tax_authority_code'],
                    'metadata' => $line['metadata'] ?? [],
                    'line_order' => $order++,
                ]);
            }
        }
    }

    /**
     * Check if new tax engine is enabled (feature flag).
     */
    public static function isTaxEngineEnabled(): bool
    {
        return (bool) config('tax.use_tax_engine', false);
    }
}
