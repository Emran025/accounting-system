<?php

namespace Database\Seeders;

use App\Models\TaxAuthority;
use App\Models\TaxType;
use App\Models\TaxRate;
use Illuminate\Database\Seeder;

/**
 * Seeds tax authorities, types, and rates for ZATCA (Saudi) and optional UAE.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class TaxSeeder extends Seeder
{
    public function run(): void
    {
        // ZATCA - Saudi Arabia
        $zatca = TaxAuthority::updateOrCreate(
            ['code' => 'ZATCA'],
            [
                'name' => 'ZATCA - Saudi Tax Authority',
                'country_code' => 'SA',
                'adapter_class' => \App\Services\Tax\ZATCATaxAuthority::class,
                'config' => null,
                'is_active' => true,
                'is_primary' => true,
            ]
        );

        $vat = TaxType::updateOrCreate(
            ['tax_authority_id' => $zatca->id, 'code' => 'VAT'],
            [
                'name' => 'Value Added Tax',
                'gl_account_code' => null, // From ChartOfAccountsMappingService
                'is_active' => true,
            ]
        );

        TaxRate::updateOrCreate(
            [
                'tax_type_id' => $vat->id,
                'effective_from' => '2020-07-01',
            ],
            [
                'rate' => 0.15,
                'effective_to' => null,
                'description' => 'Standard VAT 15%',
                'is_default' => true,
            ]
        );

        // Zero-rated for future use
        TaxType::updateOrCreate(
            ['tax_authority_id' => $zatca->id, 'code' => 'ZERO'],
            [
                'name' => 'Zero Rated',
                'gl_account_code' => null,
                'is_active' => true,
            ]
        );
    }
}
