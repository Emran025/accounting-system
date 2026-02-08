<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contingent_workers', function (Blueprint $table) {
            $table->id();
            $table->string('worker_code', 50)->unique();
            $table->string('full_name', 100);
            $table->string('email', 100)->nullable();
            $table->string('phone', 20)->nullable();
            $table->enum('worker_type', ['contractor', 'consultant', 'freelancer', 'temp_agency'])->default('contractor');
            $table->string('company_name', 255)->nullable();
            $table->string('tax_id', 50)->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'inactive', 'terminated'])->default('active');
            $table->text('service_description')->nullable();
            $table->string('sow_number', 50)->nullable(); // Statement of Work
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->decimal('monthly_rate', 10, 2)->nullable();
            $table->text('contract_terms')->nullable();
            $table->date('badge_expiry')->nullable();
            $table->date('system_access_expiry')->nullable();
            $table->boolean('has_insurance')->default(false);
            $table->text('insurance_details')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contingent_workers');
    }
};

