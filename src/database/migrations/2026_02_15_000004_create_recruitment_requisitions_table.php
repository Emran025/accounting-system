<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_requisitions', function (Blueprint $table) {
            $table->id();
            $table->string('requisition_number', 50)->unique();
            $table->string('job_title', 255);
            $table->text('job_description')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->foreignId('role_id')->nullable()->constrained('roles')->onDelete('set null');
            $table->integer('number_of_positions')->default(1);
            $table->enum('employment_type', ['full_time', 'part_time', 'contract', 'temporary'])->default('full_time');
            $table->decimal('budgeted_salary_min', 10, 2)->nullable();
            $table->decimal('budgeted_salary_max', 10, 2)->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'closed', 'filled'])->default('draft');
            $table->date('target_start_date')->nullable();
            $table->text('required_qualifications')->nullable();
            $table->text('preferred_qualifications')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->boolean('is_published')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_requisitions');
    }
};

