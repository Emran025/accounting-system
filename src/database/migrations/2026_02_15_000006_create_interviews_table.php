<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('applicant_id')->constrained('job_applicants')->onDelete('cascade');
            $table->foreignId('interviewer_id')->constrained('users')->onDelete('cascade');
            $table->enum('interview_type', ['phone', 'video', 'in_person', 'panel'])->default('in_person');
            $table->datetime('scheduled_at');
            $table->datetime('completed_at')->nullable();
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->integer('rating')->nullable(); // 1-5 scale
            $table->text('feedback')->nullable();
            $table->text('notes')->nullable();
            $table->string('location', 255)->nullable();
            $table->text('meeting_link')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interviews');
    }
};

