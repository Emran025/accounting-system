<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_media_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('merchant_id')->nullable()->constrained('marketplace_merchants')->nullOnDelete();
            $table->string('disk', 40)->default('public');
            $table->string('path', 2048);
            $table->string('original_name', 255);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('alt_text_ar', 500)->nullable();
            $table->string('alt_text_en', 500)->nullable();
            $table->string('status', 30)->default('ready');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['merchant_id', 'status']);
            $table->index(['mime_type', 'created_at']);
        });

        Schema::create('marketplace_media_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('media_asset_id')->constrained('marketplace_media_assets')->cascadeOnDelete();
            // uuidMorphs() derives an index name longer than MySQL's 64-byte
            // identifier limit for this table. Keep its schema semantics while
            // naming the lookup index explicitly and portably.
            $table->string('assignable_type');
            $table->uuid('assignable_id');
            $table->index(['assignable_type', 'assignable_id'], 'marketplace_media_assignment_assignable_idx');
            $table->string('role', 30)->default('gallery');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['media_asset_id', 'assignable_type', 'assignable_id', 'role'], 'marketplace_media_assignment_unique');
            $table->index(['assignable_type', 'assignable_id', 'role', 'sort_order'], 'marketplace_media_assignment_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_media_assignments');
        Schema::dropIfExists('marketplace_media_assets');
    }
};
