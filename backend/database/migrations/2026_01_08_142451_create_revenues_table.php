<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenues', function (Blueprint $table) {
            $table->id();
            $table->string('source', 255);
            $table->string('voucher_number', 50)->nullable()->index(); // Link to GL
            $table->foreign('voucher_number')->references('voucher_number')->on('universal_journals')->onDelete('cascade');
            $table->timestamp('revenue_date')->useCurrent();
            $table->text('description')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenues');
    }
};
