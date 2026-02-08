<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capa', function (Blueprint $table) {
            $table->id();
            $table->string('capa_number', 50)->unique();
            $table->foreignId('compliance_id')->nullable()->constrained('qa_compliance')->onDelete('set null');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('type', ['corrective', 'preventive'])->default('corrective');
            $table->text('issue_description');
            $table->text('root_cause')->nullable();
            $table->text('action_plan')->nullable();
            $table->enum('status', ['open', 'in_progress', 'completed', 'closed', 'cancelled'])->default('open');
            $table->date('target_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->text('verification')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capa');
    }
};

