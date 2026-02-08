<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('learning_courses')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('enrollment_type', ['assigned', 'self_enrolled', 'mandatory'])->default('self_enrolled');
            $table->enum('status', ['enrolled', 'in_progress', 'completed', 'failed', 'dropped'])->default('enrolled');
            $table->date('enrollment_date');
            $table->date('start_date')->nullable();
            $table->date('completion_date')->nullable();
            $table->date('due_date')->nullable();
            $table->integer('progress_percentage')->default(0);
            $table->integer('score')->nullable();
            $table->boolean('is_passed')->default(false);
            $table->text('certificate_path')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_enrollments');
    }
};

