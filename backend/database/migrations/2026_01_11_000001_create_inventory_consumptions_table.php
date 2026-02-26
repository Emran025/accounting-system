<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventory_consumptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('inventory_costing_id');
            $table->string('consumption_type')->default('sale'); // sale, loss, adjustment
            $table->unsignedBigInteger('reference_id'); // e.g., InvoiceItem ID or Invoice ID
            $table->string('reference_type')->default('invoices'); 
            $table->integer('quantity'); // Amount consumed
            $table->decimal('unit_cost', 15, 4); // Frozen cost at time of consumption
            $table->decimal('total_cost', 15, 4);
            $table->timestamps();

            $table->foreign('inventory_costing_id')->references('id')->on('inventory_costing');
            $table->index(['inventory_costing_id', 'consumption_type'], 'idx_costing_consumption');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_consumptions');
    }
};
