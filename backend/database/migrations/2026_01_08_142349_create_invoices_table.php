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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();
            $table->string('voucher_number', 50)->nullable()->index();
            $table->decimal('total_amount', 10, 2);
            $table->decimal('subtotal', 10, 2)->default(0.00);
            $table->decimal('vat_rate', 5, 2)->default(0.00);
            $table->decimal('vat_amount', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->string('payment_type', 20)->default('cash'); // 'cash' or 'credit'
            $table->foreignId('customer_id')->nullable()->constrained('ar_customers')->onDelete('set null');
            $table->decimal('amount_paid', 10, 2)->default(0.00);
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->boolean('is_reversed')->default(false);
            $table->dateTime('reversed_at')->nullable();
            $table->foreignId('reversed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->decimal('exchange_rate', 12, 4)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
