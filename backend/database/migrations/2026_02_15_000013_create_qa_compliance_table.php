<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qa_compliance', function (Blueprint $table) {
            $table->id();
            $table->string('compliance_number', 50)->unique();
            $table->enum('compliance_type', ['iso', 'soc', 'internal_audit', 'regulatory', 'other'])->default('internal_audit');
            $table->string('standard_name', 255);
            $table->text('description')->nullable();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'non_compliant', 'cancelled'])->default('pending');
            $table->date('due_date')->nullable();
            $table->date('completed_date')->nullable();
            $table->text('findings')->nullable();
            $table->text('corrective_action')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qa_compliance');
    }
};

