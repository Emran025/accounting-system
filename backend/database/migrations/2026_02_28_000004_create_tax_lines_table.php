<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Immutable tax line items - audit trail for every calculation.
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        Schema::create('tax_lines', function (Blueprint $table) {
            $table->id();
            $table->string('taxable_type'); // invoices, purchases, sales_returns, etc.
            $table->unsignedBigInteger('taxable_id');
            $table->foreignId('tax_authority_id')->constrained()->onDelete('cascade');
            $table->foreignId('tax_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('tax_rate_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('rate', 8, 4)->default(0);
            $table->decimal('taxable_amount', 15, 4)->default(0);
            $table->decimal('tax_amount', 15, 4);
            $table->string('tax_type_code', 20)->comment('Snapshot: VAT, EXCISE');
            $table->string('tax_authority_code', 20)->comment('Snapshot: ZATCA');
            $table->json('metadata')->nullable()->comment('Calculation context, exemptions, etc.');
            $table->unsignedInteger('line_order')->default(0);
            $table->timestamps();

            $table->index(['taxable_type', 'taxable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_lines');
    }
};
