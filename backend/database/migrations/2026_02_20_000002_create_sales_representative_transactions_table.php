<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_representative_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_representative_id')->constrained('sales_representatives')->onDelete('cascade');
            $table->enum('type', ['commission', 'payment', 'return', 'adjustment']);
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();
            $table->string('reference_type')->nullable(); // invoices, sales_returns
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamp('transaction_date')->useCurrent();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_representative_transactions');
    }
};
