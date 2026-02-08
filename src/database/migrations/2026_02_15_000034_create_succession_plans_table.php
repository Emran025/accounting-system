<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('succession_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('position_id')->nullable(); // Future positions table
            $table->string('position_title', 255);
            $table->foreignId('incumbent_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('readiness_level', ['ready_now', 'ready_1_2_years', 'ready_3_5_years', 'not_ready'])->default('ready_1_2_years');
            $table->enum('status', ['active', 'inactive', 'filled'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('succession_plans');
    }
};

