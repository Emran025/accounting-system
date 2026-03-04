<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('position_code', 50)->unique();
            $table->string('position_name_ar');
            $table->string('position_name_en')->nullable();
            $table->foreignId('job_title_id')->constrained('job_titles')->onDelete('cascade');
            $table->foreignId('role_id')->nullable()->constrained('roles')->onDelete('set null');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->string('grade_level', 50)->nullable();
            $table->decimal('min_salary', 15, 2)->nullable();
            $table->decimal('max_salary', 15, 2)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('job_title_id');
            $table->index('role_id');
            $table->index('department_id');
            $table->index('is_active');
        });

        // Add position_id to employees table
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('position_id')->nullable()->after('department_id')
                  ->constrained('positions')->onDelete('set null');
            $table->index('position_id');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['position_id']);
            $table->dropColumn('position_id');
        });

        Schema::dropIfExists('positions');
    }
};
