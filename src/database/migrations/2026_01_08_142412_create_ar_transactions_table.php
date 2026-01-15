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
        Schema::create('ar_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('ar_customers')->onDelete('cascade');
            $table->string('type', 20); // 'invoice', 'payment', 'return'
            $table->decimal('amount', 10, 2);
            $table->text('description')->nullable();
            $table->string('reference_type', 50)->nullable(); // table name e.g. 'invoices'
            $table->unsignedBigInteger('reference_id')->nullable(); // record id in reference table
            $table->timestamp('transaction_date')->useCurrent();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ar_transactions');
    }
};
