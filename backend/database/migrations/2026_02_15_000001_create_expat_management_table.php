<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expat_management', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('passport_number', 50)->nullable();
            $table->date('passport_expiry')->nullable();
            $table->string('visa_number', 50)->nullable();
            $table->date('visa_expiry')->nullable();
            $table->string('work_permit_number', 50)->nullable();
            $table->date('work_permit_expiry')->nullable();
            $table->string('residency_number', 50)->nullable();
            $table->date('residency_expiry')->nullable();
            $table->string('host_country', 100)->nullable();
            $table->string('home_country', 100)->nullable();
            $table->decimal('cost_of_living_adjustment', 10, 2)->default(0);
            $table->decimal('housing_allowance', 10, 2)->default(0);
            $table->decimal('relocation_package', 10, 2)->default(0);
            $table->boolean('tax_equalization')->default(false);
            $table->date('repatriation_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expat_management');
    }
};

