<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill tax_lines from existing vat_rate/vat_amount on invoices.
     * Zero-downtime migration - creates audit trail for legacy invoices.
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        $authorityId = DB::table('tax_authorities')->where('code', 'ZATCA')->value('id');
        $vatTypeId = DB::table('tax_types')
            ->where('tax_authority_id', $authorityId)
            ->where('code', 'VAT')
            ->value('id');

        if (!$authorityId || !$vatTypeId) {
            return; // Tax tables not seeded yet
        }

        $invoices = DB::table('invoices')
            ->whereNotNull('vat_amount')
            ->where('vat_amount', '>', 0)
            ->get();

        foreach ($invoices as $inv) {
            $exists = DB::table('tax_lines')
                ->where('taxable_type', \App\Models\Invoice::class)
                ->where('taxable_id', $inv->id)
                ->exists();

            if ($exists) {
                continue;
            }

            $taxableAmount = (float) $inv->subtotal - (float) ($inv->discount_amount ?? 0);
            $rate = (float) ($inv->vat_rate ?? 0);
            $taxAmount = (float) $inv->vat_amount;

            DB::table('tax_lines')->insert([
                'taxable_type' => \App\Models\Invoice::class,
                'taxable_id' => $inv->id,
                'tax_authority_id' => $authorityId,
                'tax_type_id' => $vatTypeId,
                'tax_rate_id' => null,
                'rate' => $rate ?: 0.15,
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $taxAmount,
                'tax_type_code' => 'VAT',
                'tax_authority_code' => 'ZATCA',
                'metadata' => json_encode(['migrated' => true, 'source' => 'legacy']),
                'line_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('tax_lines')
            ->where('taxable_type', \App\Models\Invoice::class)
            ->where('metadata', 'like', '%"migrated":true%')
            ->delete();
    }
};
