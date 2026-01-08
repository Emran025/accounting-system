<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_costing', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('purchase_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('quantity');
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('total_cost', 15, 2);
            $table->string('costing_method', 20)->default('FIFO'); // FIFO, WEIGHTED_AVG
            $table->timestamp('transaction_date')->useCurrent();
            $table->string('reference_type', 50)->nullable(); // purchases, sales
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->boolean('is_sold')->default(false);
            $table->timestamp('sold_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('product_id');
            $table->index(['product_id', 'is_sold']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_costing');
    }
};
