<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('goal_title', 255);
            $table->text('goal_description');
            $table->enum('goal_type', ['okr', 'kpi', 'personal', 'team', 'corporate'])->default('personal');
            $table->foreignId('parent_goal_id')->nullable()->constrained('performance_goals')->onDelete('set null');
            $table->enum('status', ['not_started', 'in_progress', 'on_track', 'at_risk', 'completed', 'cancelled'])->default('not_started');
            $table->decimal('target_value', 10, 2)->nullable();
            $table->decimal('current_value', 10, 2)->default(0);
            $table->string('unit', 50)->nullable();
            $table->date('start_date');
            $table->date('target_date');
            $table->date('completed_date')->nullable();
            $table->integer('progress_percentage')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_goals');
    }
};

