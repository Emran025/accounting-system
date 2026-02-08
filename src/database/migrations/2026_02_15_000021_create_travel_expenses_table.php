<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('travel_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('travel_request_id')->nullable()->constrained('travel_requests')->onDelete('set null');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('expense_type', ['flight', 'hotel', 'meal', 'transportation', 'other'])->default('other');
            $table->date('expense_date');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('SAR');
            $table->decimal('exchange_rate', 10, 4)->default(1);
            $table->decimal('amount_in_base_currency', 10, 2);
            $table->string('receipt_path', 500)->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['pending', 'submitted', 'approved', 'rejected', 'reimbursed'])->default('pending');
            $table->boolean('is_duplicate')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('travel_expenses');
    }
};

