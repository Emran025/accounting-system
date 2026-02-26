<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('type', 50); // expense, revenue, journal_voucher
            $table->string('frequency', 20); // daily, weekly, monthly, quarterly, annually
            $table->date('next_due_date');
            $table->date('last_generated_date')->nullable();
            $table->json('template_data');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_transactions');
    }
};
