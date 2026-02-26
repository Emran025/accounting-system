<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->date('contract_start_date');
            $table->date('contract_end_date')->nullable();
            $table->decimal('base_salary', 15, 2);
            $table->enum('contract_type', ['full_time', 'part_time', 'contract', 'freelance'])->default('full_time');
            $table->integer('working_hours_per_day')->default(8);
            $table->integer('working_days_per_week')->default(5);
            $table->boolean('is_current')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index(['employee_id', 'is_current']);
            $table->index('contract_start_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_contracts');
    }
};



