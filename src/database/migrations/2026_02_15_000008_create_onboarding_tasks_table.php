<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('onboarding_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('onboarding_workflows')->onDelete('cascade');
            $table->string('task_name', 255);
            $table->text('description')->nullable();
            $table->enum('task_type', ['it_provisioning', 'badge_access', 'system_id', 'document', 'training', 'facilities', 'security', 'payroll', 'other'])->default('other');
            $table->enum('department', ['it', 'facilities', 'security', 'hr', 'payroll', 'other'])->default('hr');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'blocked'])->default('pending');
            $table->integer('sequence_order')->default(0);
            $table->date('due_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_tasks');
    }
};

