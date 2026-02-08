<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_health_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('record_type', ['vaccination', 'medical_exam', 'drug_test', 'health_screening', 'other'])->default('medical_exam');
            $table->date('record_date');
            $table->date('expiry_date')->nullable();
            $table->string('provider_name', 255)->nullable();
            $table->text('results')->nullable();
            $table->string('file_path', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_health_records');
    }
};

