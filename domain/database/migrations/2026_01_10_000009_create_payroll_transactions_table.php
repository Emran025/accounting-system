<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('payroll_transactions');
        
        Schema::create('payroll_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_item_id')->nullable()->constrained('payroll_items')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->enum('transaction_type', ['payment', 'advance', 'bonus', 'other'])->default('payment');
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_transactions');
    }
};
