<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unearned_revenue', function (Blueprint $table) {
            $table->id();
            $table->date('receipt_date');
            $table->decimal('total_amount', 15, 2);
            $table->integer('months');
            $table->text('description')->nullable();
            $table->string('revenue_account_code', 20)->nullable();
            $table->decimal('recognized_amount', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unearned_revenue');
    }
};
