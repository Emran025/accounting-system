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
        Schema::create('government_fees', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 50)->nullable();
            $table->decimal('percentage', 5, 2)->default(0.00); // e.g., 5.00 for 5%
            $table->decimal('fixed_amount', 10, 2)->default(0.00)->nullable(); // Option for fixed fee
            $table->boolean('is_active')->default(true);
            
            // Link to Chart of Accounts for Liability Booking
            $table->foreignId('account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            
            $table->timestamps();
        });

        Schema::create('invoice_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('fee_id')->nullable()->constrained('government_fees')->nullOnDelete();
            
            $table->string('fee_name', 100); // Snapshot of name
            $table->decimal('fee_percentage', 5, 2)->default(0.00); // Snapshot
            $table->decimal('amount', 10, 2); // Calculated amount
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_fees');
        Schema::dropIfExists('government_fees');
    }
};
