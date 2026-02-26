<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compensation_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compensation_plan_id')->constrained('compensation_plans')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->decimal('current_salary', 10, 2);
            $table->decimal('proposed_salary', 10, 2);
            $table->decimal('increase_amount', 10, 2);
            $table->decimal('increase_percentage', 5, 2);
            $table->decimal('comp_ratio', 5, 2)->nullable(); // Compensation ratio vs market
            $table->enum('status', ['pending', 'approved', 'rejected', 'processed'])->default('pending');
            $table->text('justification')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compensation_entries');
    }
};

