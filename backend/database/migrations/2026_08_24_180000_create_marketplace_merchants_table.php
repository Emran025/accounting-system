<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_merchants', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('slug', 120)->unique();
            $table->string('display_name_ar', 255);
            $table->string('display_name_en', 255)->nullable();
            $table->text('short_description_ar')->nullable();
            $table->text('short_description_en')->nullable();
            $table->string('logo_media_url', 2048)->nullable();
            $table->string('public_url', 2048)->nullable();
            $table->enum('status', ['draft', 'submitted', 'verified', 'suspended', 'retired'])->default('draft')->index();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable()->index();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();

            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_merchants');
    }
};
