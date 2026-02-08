<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wellness_programs', function (Blueprint $table) {
            $table->id();
            $table->string('program_name', 255);
            $table->text('description')->nullable();
            $table->enum('program_type', ['steps_challenge', 'health_challenge', 'fitness', 'nutrition', 'mental_health', 'other'])->default('steps_challenge');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(true);
            $table->json('target_metrics')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wellness_programs');
    }
};

