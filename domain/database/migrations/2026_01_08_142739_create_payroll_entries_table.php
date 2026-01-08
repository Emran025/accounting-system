<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_entries', function (Blueprint $table) {
            $table->id();
            $table->date('payroll_date');
            $table->decimal('gross_pay', 15, 2);
            $table->decimal('deductions', 15, 2)->default(0);
            $table->decimal('net_pay', 15, 2);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('accrued');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_entries');
    }
};
