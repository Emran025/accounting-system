<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('workforce_schedules')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->date('shift_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('shift_type', ['regular', 'overtime', 'on_call', 'standby'])->default('regular');
            $table->decimal('hours', 5, 2)->default(0);
            $table->enum('status', ['scheduled', 'confirmed', 'swapped', 'cancelled', 'completed'])->default('scheduled');
            $table->foreignId('swapped_with')->nullable()->constrained('employees')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_shifts');
    }
};

