<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tax rates with effective dates - supports rate history for audits.
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_type_id')->constrained()->onDelete('cascade');
            $table->decimal('rate', 8, 4)->default(0)->comment('e.g. 0.15 for 15%');
            $table->decimal('fixed_amount', 10, 2)->default(0)->comment('For fixed fees');
            $table->date('effective_from');
            $table->date('effective_to')->nullable()->comment('null = still in effect');
            $table->string('description', 255)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['tax_type_id', 'effective_from', 'effective_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
