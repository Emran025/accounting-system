<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('asset_code', 50)->unique();
            $table->string('asset_name', 255);
            $table->enum('asset_type', ['laptop', 'phone', 'vehicle', 'key', 'equipment', 'other'])->default('other');
            $table->string('serial_number', 100)->nullable();
            $table->string('qr_code', 100)->nullable();
            $table->date('allocation_date');
            $table->date('return_date')->nullable();
            $table->enum('status', ['allocated', 'returned', 'maintenance', 'lost', 'damaged'])->default('allocated');
            $table->text('notes')->nullable();
            $table->foreignId('cost_center_id')->nullable()->constrained('chart_of_accounts')->onDelete('set null');
            $table->foreignId('project_id')->nullable(); // For future project module
            $table->date('next_maintenance_date')->nullable();
            $table->text('maintenance_notes')->nullable();
            $table->string('digital_signature_path', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_assets');
    }
};

