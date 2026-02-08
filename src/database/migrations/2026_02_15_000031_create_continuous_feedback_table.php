<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('continuous_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->foreignId('given_by')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('feedback_type', ['check_in', 'praise', 'improvement', 'coaching', 'other'])->default('check_in');
            $table->text('feedback_content');
            $table->date('feedback_date');
            $table->boolean('is_visible_to_employee')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('continuous_feedback');
    }
};

