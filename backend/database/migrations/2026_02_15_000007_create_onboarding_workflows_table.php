<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('onboarding_workflows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('workflow_type', ['onboarding', 'offboarding'])->default('onboarding');
            $table->enum('status', ['not_started', 'in_progress', 'completed', 'cancelled'])->default('not_started');
            $table->date('start_date');
            $table->date('target_completion_date')->nullable();
            $table->date('actual_completion_date')->nullable();
            $table->integer('completion_percentage')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_workflows');
    }
};

