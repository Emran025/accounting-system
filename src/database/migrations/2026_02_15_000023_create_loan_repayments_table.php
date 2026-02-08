<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_repayments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_id')->constrained('employee_loans')->onDelete('cascade');
            $table->integer('installment_number');
            $table->date('due_date');
            $table->date('paid_date')->nullable();
            $table->decimal('amount', 10, 2);
            $table->decimal('principal', 10, 2);
            $table->decimal('interest', 10, 2)->default(0);
            $table->enum('status', ['pending', 'paid', 'overdue', 'skipped'])->default('pending');
            $table->foreignId('payroll_cycle_id')->nullable()->constrained('payroll_cycles')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_repayments');
    }
};

