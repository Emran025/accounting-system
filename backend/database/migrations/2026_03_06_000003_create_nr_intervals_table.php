<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nr_intervals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nr_object_id');
            $table->string('code', 20);                           // Interval identifier (INT-01)
            $table->string('description')->nullable();
            $table->unsignedBigInteger('from_number');             // Range start
            $table->unsignedBigInteger('to_number');               // Range end
            $table->unsignedBigInteger('current_number')->default(0); // Current position (0 = not started)
            $table->boolean('is_external')->default(false);        // External = manual assignment
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('nr_object_id')->references('id')->on('nr_objects')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['nr_object_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nr_intervals');
    }
};
