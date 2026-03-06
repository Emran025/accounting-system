<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nr_expansion_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nr_interval_id');
            $table->unsignedBigInteger('old_from');
            $table->unsignedBigInteger('old_to');
            $table->unsignedBigInteger('new_from');
            $table->unsignedBigInteger('new_to');
            $table->string('reason')->nullable();
            $table->unsignedBigInteger('expanded_by')->nullable();
            $table->timestamps();

            $table->foreign('nr_interval_id')->references('id')->on('nr_intervals')->cascadeOnDelete();
            $table->foreign('expanded_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nr_expansion_logs');
    }
};
