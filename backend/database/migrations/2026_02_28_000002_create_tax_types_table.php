<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tax types (VAT, Excise, etc.) - category of tax within an authority.
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        Schema::create('tax_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_authority_id')->constrained()->onDelete('cascade');
            $table->string('code', 20)->comment('e.g. VAT, EXCISE, ZERO');
            $table->string('name', 100);
            $table->string('gl_account_code', 20)->nullable()->comment('Output VAT account, etc.');
            $table->string('calculation_type', 20)->default('percentage')->comment('percentage or fixed_amount');
            $table->json('applicable_areas')->nullable()->comment('JSON Array e.g., ["sales", "purchases", "payroll"]');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tax_authority_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_types');
    }
};
