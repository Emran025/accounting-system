<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wellness_participations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('wellness_programs')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->json('metrics_data')->nullable(); // Store steps, etc.
            $table->integer('points')->default(0);
            $table->enum('status', ['enrolled', 'active', 'completed', 'dropped'])->default('enrolled');
            $table->date('enrollment_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wellness_participations');
    }
};

