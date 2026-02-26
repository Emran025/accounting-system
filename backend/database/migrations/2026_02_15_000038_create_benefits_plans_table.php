<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benefits_plans', function (Blueprint $table) {
            $table->id();
            $table->string('plan_code', 50)->unique();
            $table->string('plan_name', 255);
            $table->enum('plan_type', ['health', 'dental', 'vision', 'life_insurance', 'disability', 'retirement', 'fsa', 'hsa', 'other'])->default('health');
            $table->text('description')->nullable();
            $table->enum('eligibility_rule', ['all', 'full_time', 'tenure', 'role', 'custom'])->default('all');
            $table->json('eligibility_criteria')->nullable();
            $table->decimal('employee_contribution', 10, 2)->default(0);
            $table->decimal('employer_contribution', 10, 2)->default(0);
            $table->date('effective_date');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefits_plans');
    }
};

