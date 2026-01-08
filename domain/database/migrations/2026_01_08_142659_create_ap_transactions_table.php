<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ap_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('ap_suppliers')->onDelete('cascade');
            $table->string('type', 20); // 'invoice', 'payment', 'return'
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();
            $table->string('reference_type', 50)->nullable(); // table name e.g. 'purchases'
            $table->unsignedBigInteger('reference_id')->nullable(); // record id in reference table
            $table->timestamp('transaction_date')->useCurrent();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('supplier_id');
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ap_transactions');
    }
};
