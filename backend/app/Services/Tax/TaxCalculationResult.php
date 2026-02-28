<?php

namespace App\Services\Tax;

/**
 * Result of a tax calculation - supports multiple tax lines.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxCalculationResult
{
    /** @var array<int, array{rate: float, taxable_amount: float, tax_amount: float, tax_type_code: string, tax_authority_code: string, tax_authority_id: int, tax_type_id: int, tax_rate_id: ?int}> */
    public array $lines = [];

    public float $totalTaxableAmount = 0;
    public float $totalTaxAmount = 0;

    public function addLine(
        float $rate,
        float $taxableAmount,
        float $taxAmount,
        string $taxTypeCode,
        string $taxAuthorityCode,
        int $taxAuthorityId,
        int $taxTypeId,
        ?int $taxRateId = null,
        array $metadata = [],
        ?string $glAccountCode = null,
        ?string $taxTypeName = null
    ): self {
        $this->lines[] = [
            'rate' => $rate,
            'taxable_amount' => $taxableAmount,
            'tax_amount' => $taxAmount,
            'tax_type_code' => $taxTypeCode,
            'tax_authority_code' => $taxAuthorityCode,
            'tax_authority_id' => $taxAuthorityId,
            'tax_type_id' => $taxTypeId,
            'tax_rate_id' => $taxRateId,
            'metadata' => $metadata,
            'gl_account_code' => $glAccountCode,
            'tax_type_name' => $taxTypeName,
        ];
        $this->totalTaxableAmount += $taxableAmount;
        $this->totalTaxAmount += $taxAmount;

        return $this;
    }

    /**
     * Legacy: primary VAT rate (first VAT line or 0).
     */
    public function getPrimaryVatRate(): float
    {
        foreach ($this->lines as $line) {
            if (strtoupper($line['tax_type_code']) === 'VAT') {
                return (float) $line['rate'];
            }
        }
        return 0.0;
    }

    /**
     * Legacy: total tax (for backward compatibility with vat_amount).
     */
    public function getTotalTax(): float
    {
        return round($this->totalTaxAmount, 2);
    }
}
