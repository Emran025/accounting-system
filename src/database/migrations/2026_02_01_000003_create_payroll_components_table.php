<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_components', function (Blueprint $table) {
            $table->id();
            $table->string('component_code', 50)->unique();
            $table->string('component_name', 100);
            $table->enum('component_type', ['allowance', 'deduction', 'overtime', 'bonus', 'other'])->default('allowance');
            $table->enum('calculation_type', ['fixed', 'percentage', 'formula', 'attendance_based'])->default('fixed');
            $table->decimal('base_amount', 15, 2)->nullable(); // For fixed or percentage base
            $table->decimal('percentage', 5, 2)->nullable(); // For percentage type
            $table->text('formula')->nullable(); // For formula type (e.g., "hours * rate * 1.5")
            $table->boolean('is_taxable')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('display_order')->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index('component_type');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_components');
    }
};

