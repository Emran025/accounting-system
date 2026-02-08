<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_courses', function (Blueprint $table) {
            $table->id();
            $table->string('course_code', 50)->unique();
            $table->string('course_name', 255);
            $table->text('description')->nullable();
            $table->enum('delivery_method', ['in_person', 'virtual', 'elearning', 'blended'])->default('elearning');
            $table->enum('course_type', ['mandatory', 'optional', 'compliance', 'development'])->default('optional');
            $table->integer('duration_hours')->default(0);
            $table->string('scorm_path', 500)->nullable();
            $table->string('video_url', 500)->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->integer('recurrence_months')->nullable();
            $table->boolean('requires_assessment')->default(false);
            $table->integer('passing_score')->nullable();
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_courses');
    }
};

