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

        $invoices = \App\Models\Invoice::with(['glEntries', 'items'])->get();

        foreach ($invoices as $inv) {
            $exists = DB::table('tax_lines')
                ->where('taxable_type', \App\Models\Invoice::class)
                ->where('taxable_id', $inv->id)
                ->exists();

            if ($exists) {
                continue;
            }

            // Using "true tables" integration - invoices derive amounts from GL and items
            $taxAmount = (float) $inv->vat_amount;
            if ($taxAmount <= 0) {
                continue;
            }

            $taxableAmount = (float) $inv->subtotal - (float) $inv->discount_amount;
            
            // Resolve true tax rate from true tables based on invoice creation date
            $date = $inv->created_at ? $inv->created_at->format('Y-m-d') : now()->format('Y-m-d');
            $taxRate = DB::table('tax_rates')
                ->where('tax_type_id', $vatTypeId)
                ->where('effective_from', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('effective_to')->orWhere('effective_to', '>=', $date);
                })
                ->orderByDesc('effective_from')
                ->first();
                
            if (!$taxRate) {
                $taxRate = DB::table('tax_rates')
                    ->where('tax_type_id', $vatTypeId)
                    ->where('is_default', true)
                    ->first();
            }

            $rate = $taxRate ? (float) $taxRate->rate : ($taxableAmount > 0 ? round($taxAmount / $taxableAmount, 4) : 0.15);

            DB::table('tax_lines')->insert([
                'taxable_type' => \App\Models\Invoice::class,
                'taxable_id' => $inv->id,
                'tax_authority_id' => $authorityId,
                'tax_type_id' => $vatTypeId,
                'tax_rate_id' => $taxRate ? $taxRate->id : null,
                'rate' => $rate,
                'taxable_amount' => $taxableAmount,
                'tax_amount' => $taxAmount,
                'tax_type_code' => 'VAT',
                'tax_authority_code' => 'ZATCA',
                'metadata' => json_encode(['migrated' => true, 'source' => 'legacy', 'derived_from_gl' => true]),
                'line_order' => 0,
                'created_at' => $inv->created_at ?? now(),
                'updated_at' => $inv->updated_at ?? now(),
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
