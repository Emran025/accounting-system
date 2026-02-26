<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_appraisals', function (Blueprint $table) {
            $table->id();
            $table->string('appraisal_number', 50)->unique();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('appraisal_type', ['self', 'manager', 'peer', '360', 'annual', 'mid_year'])->default('annual');
            $table->string('appraisal_period', 50); // e.g., "2024 Q1"
            $table->date('appraisal_date');
            $table->enum('status', ['draft', 'self_review', 'manager_review', 'calibration', 'completed', 'cancelled'])->default('draft');
            $table->json('ratings'); // Store structured ratings
            $table->text('self_assessment')->nullable();
            $table->text('manager_feedback')->nullable();
            $table->text('peer_feedback')->nullable();
            $table->decimal('overall_rating', 3, 2)->nullable(); // 1.00 to 5.00
            $table->foreignId('manager_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_appraisals');
    }
};

