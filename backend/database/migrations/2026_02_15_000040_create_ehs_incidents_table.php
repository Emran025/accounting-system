<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ehs_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('incident_number', 50)->unique();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('incident_type', ['accident', 'near_miss', 'injury', 'illness', 'property_damage', 'environmental', 'other'])->default('accident');
            $table->date('incident_date');
            $table->time('incident_time')->nullable();
            $table->string('location', 255)->nullable();
            $table->text('description');
            $table->enum('severity', ['minor', 'moderate', 'serious', 'critical', 'fatal'])->default('minor');
            $table->enum('status', ['reported', 'under_investigation', 'resolved', 'closed'])->default('reported');
            $table->text('immediate_action_taken')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('preventive_measures')->nullable();
            $table->boolean('osha_reportable')->default(false);
            $table->string('osha_report_path', 500)->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('investigated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ehs_incidents');
    }
};

