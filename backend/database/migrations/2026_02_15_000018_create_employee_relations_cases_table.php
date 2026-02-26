<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_relations_cases', function (Blueprint $table) {
            $table->id();
            $table->string('case_number', 50)->unique();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('case_type', ['grievance', 'disciplinary', 'investigation', 'whistleblowing', 'complaint', 'other'])->default('grievance');
            $table->enum('confidentiality_level', ['public', 'confidential', 'highly_confidential'])->default('confidential');
            $table->text('description');
            $table->enum('status', ['open', 'under_investigation', 'hearing', 'resolved', 'closed', 'escalated'])->default('open');
            $table->date('reported_date');
            $table->date('resolved_date')->nullable();
            $table->text('resolution')->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_relations_cases');
    }
};

