<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nr_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('nr_object_id');
            $table->string('code', 20);                           // Short code (GRP-01)
            $table->string('name');                                 // Arabic name (e.g. مجموعة الإداريين)
            $table->string('name_en')->nullable();                 // English name
            $table->string('description')->nullable();
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
        Schema::dropIfExists('nr_groups');
    }
};
