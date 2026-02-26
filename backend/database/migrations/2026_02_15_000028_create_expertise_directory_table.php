<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expertise_directory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('skill_name', 255);
            $table->enum('proficiency_level', ['beginner', 'intermediate', 'advanced', 'expert'])->default('intermediate');
            $table->integer('years_of_experience')->default(0);
            $table->text('description')->nullable();
            $table->json('certifications')->nullable();
            $table->json('projects')->nullable();
            $table->boolean('is_available_for_projects')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expertise_directory');
    }
};

