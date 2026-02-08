<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppe_management', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('ppe_item', 255);
            $table->enum('ppe_type', ['helmet', 'safety_shoes', 'gloves', 'goggles', 'vest', 'mask', 'other'])->default('other');
            $table->date('issue_date');
            $table->date('expiry_date')->nullable();
            $table->date('return_date')->nullable();
            $table->enum('status', ['issued', 'returned', 'expired', 'damaged', 'lost'])->default('issued');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppe_management');
    }
};

