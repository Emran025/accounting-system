<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benefits_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('benefits_plans')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('enrollment_type', ['open_enrollment', 'new_hire', 'life_event', 'qualifying_event'])->default('open_enrollment');
            $table->date('enrollment_date');
            $table->date('effective_date');
            $table->date('termination_date')->nullable();
            $table->enum('status', ['enrolled', 'active', 'terminated', 'cancelled'])->default('enrolled');
            $table->json('coverage_details')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefits_enrollments');
    }
};

