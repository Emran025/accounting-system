<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_name');
            $table->string('device_ip', 45)->nullable();
            $table->integer('device_port')->default(4370);
            $table->string('serial_number', 100)->nullable();
            $table->string('location')->nullable();
            $table->enum('status', ['online', 'offline', 'maintenance', 'error'])->default('offline');
            $table->timestamp('last_sync_at')->nullable();
            $table->integer('total_records_synced')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('biometric_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('device_id');
            $table->enum('sync_type', ['auto', 'manual', 'import'])->default('manual');
            $table->integer('records_imported')->default(0);
            $table->integer('records_failed')->default(0);
            $table->enum('status', ['pending', 'in_progress', 'completed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->unsignedBigInteger('initiated_by')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->foreign('device_id')->references('id')->on('biometric_devices')->cascadeOnDelete();
            $table->foreign('initiated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_sync_logs');
        Schema::dropIfExists('biometric_devices');
    }
};
