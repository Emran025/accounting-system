<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('category', 100);
            $table->string('account_code', 20)->nullable()->index();
            $table->string('voucher_number', 50)->nullable()->index(); // Link to GL
            $table->foreign('voucher_number')->references('voucher_number')->on('universal_journals')->onDelete('cascade');
            $table->timestamp('expense_date')->useCurrent();
            $table->text('description')->nullable();
            $table->enum('payment_type', ['cash', 'credit'])->default('cash');
            $table->foreignId('supplier_id')->nullable()->constrained('ap_suppliers')->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
