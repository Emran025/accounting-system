<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->string('loan_number', 50)->unique();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('loan_type', ['salary_advance', 'housing', 'car', 'personal', 'other'])->default('personal');
            $table->decimal('loan_amount', 10, 2);
            $table->decimal('interest_rate', 5, 2)->default(0);
            $table->integer('installment_count');
            $table->decimal('monthly_installment', 10, 2);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['pending', 'approved', 'active', 'completed', 'cancelled', 'defaulted'])->default('pending');
            $table->decimal('remaining_balance', 10, 2);
            $table->boolean('auto_deduction')->default(true);
            $table->foreignId('deduction_component_id')->nullable()->constrained('payroll_components')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_loans');
    }
};

