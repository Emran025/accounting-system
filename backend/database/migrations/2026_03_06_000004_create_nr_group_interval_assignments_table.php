<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nr_group_interval_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nr_object_id');
            $table->unsignedBigInteger('nr_group_id');
            $table->unsignedBigInteger('nr_interval_id');
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('nr_object_id')->references('id')->on('nr_objects')->cascadeOnDelete();
            $table->foreign('nr_group_id')->references('id')->on('nr_groups')->cascadeOnDelete();
            $table->foreign('nr_interval_id')->references('id')->on('nr_intervals')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['nr_group_id', 'nr_interval_id'], 'grp_int_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nr_group_interval_assignments');
    }
};
