<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('succession_candidates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('succession_plan_id')->constrained('succession_plans')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('readiness_level', ['ready_now', 'ready_1_2_years', 'ready_3_5_years', 'not_ready'])->default('ready_1_2_years');
            $table->integer('performance_rating')->nullable();
            $table->integer('potential_rating')->nullable();
            $table->text('development_plan')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('succession_candidates');
    }
};

