<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applicants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requisition_id')->constrained('recruitment_requisitions')->onDelete('cascade');
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('email', 100);
            $table->string('phone', 20)->nullable();
            $table->text('resume_path')->nullable();
            $table->text('cover_letter_path')->nullable();
            $table->enum('status', ['applied', 'screened', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'])->default('applied');
            $table->integer('match_score')->nullable(); // AI matching score
            $table->text('screening_notes')->nullable();
            $table->text('interview_notes')->nullable();
            $table->date('application_date');
            $table->foreignId('screened_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('interviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_anonymous')->default(false); // For blind hiring
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applicants');
    }
};

