<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workforce_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('schedule_name', 255);
            $table->date('schedule_date');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workforce_schedules');
    }
};

