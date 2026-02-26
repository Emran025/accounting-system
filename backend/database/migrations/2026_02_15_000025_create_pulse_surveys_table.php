<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pulse_surveys', function (Blueprint $table) {
            $table->id();
            $table->string('survey_name', 255);
            $table->text('description')->nullable();
            $table->enum('survey_type', ['sentiment', 'burnout', 'engagement', 'custom'])->default('engagement');
            $table->json('questions');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_anonymous')->default(true);
            $table->enum('target_audience', ['all', 'department', 'role', 'location'])->default('all');
            $table->json('target_departments')->nullable();
            $table->json('target_roles')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pulse_surveys');
    }
};

