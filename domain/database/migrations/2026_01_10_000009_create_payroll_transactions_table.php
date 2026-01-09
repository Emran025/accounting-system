<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_cycle_id')->constrained('payroll_cycles')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->foreignId('gl_entry_id')->nullable()->constrained('general_ledger')->onDelete('set null');
            $table->decimal('amount', 15, 2);
            $table->enum('transaction_type', ['salary', 'allowance', 'deduction', 'payment']);
            $table->date('transaction_date');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_transactions');
    }
};
