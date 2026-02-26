<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('org_meta_types', function (Blueprint $table) {
            $table->string('id', 32)->primary();
            $table->string('display_name', 100);
            $table->string('display_name_ar', 100)->nullable();
            $table->string('level_domain', 32)->default('Financial'); // Financial, Logistics, Sales
            $table->text('description')->nullable();
            $table->boolean('is_assignable')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_meta_types');
    }
};
