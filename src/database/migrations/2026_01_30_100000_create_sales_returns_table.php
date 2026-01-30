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
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number')->unique();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('restrict');
            $table->decimal('total_amount', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('fees_amount', 15, 2)->default(0);
            $table->text('reason')->nullable();
            $table->foreignId('user_id')->constrained('users');
            $table->string('voucher_number')->nullable();
            $table->timestamps();
            
            $table->index('invoice_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_returns');
    }
};
