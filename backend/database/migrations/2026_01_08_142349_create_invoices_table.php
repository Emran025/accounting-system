<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * SAP FI Pattern — The invoice is a DOCUMENT that references entries.
     * It does NOT store amounts. All financial data lives in:
     *   - general_ledger (amounts, currency, discount entries)
     *   - tax_lines (tax breakdown from Tax Engine)
     *   - invoice_items (line-level commercial data: product, qty, unit_price)
     *   - ar_transactions (payment tracking, linked via voucher_number)
     */
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();
            $table->string('voucher_number', 50)->nullable()->index(); // Link to GL entries

            // Operational metadata only — NO amounts
            $table->string('payment_type', 20)->default('cash'); // 'cash' or 'credit'
            $table->foreignId('customer_id')->nullable()->constrained('ar_customers')->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->boolean('is_reversed')->default(false);
            $table->dateTime('reversed_at')->nullable();
            $table->foreignId('reversed_by')->nullable()->constrained('users')->onDelete('set null');

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
