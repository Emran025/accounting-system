<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disciplinary_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->nullable()->constrained('employee_relations_cases')->onDelete('set null');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('action_type', ['verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination', 'other'])->default('written_warning');
            $table->text('violation_description');
            $table->text('action_taken');
            $table->date('action_date');
            $table->date('expiry_date')->nullable(); // For warnings that expire
            $table->string('warning_letter_path', 500)->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disciplinary_actions');
    }
};

