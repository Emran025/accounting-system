<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_catalog_publications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('merchant_id')->index();
            $table->unsignedBigInteger('product_id')->index();
            $table->string('public_slug', 160)->unique();
            $table->enum('status', ['draft', 'in_review', 'approved', 'published', 'suspended', 'withdrawn'])->default('draft')->index();
            $table->enum('visibility', ['listed', 'unlisted', 'withdrawn'])->default('unlisted')->index();
            $table->string('public_name_ar', 255)->nullable();
            $table->string('public_name_en', 255)->nullable();
            $table->text('short_description_ar')->nullable();
            $table->text('short_description_en')->nullable();
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->json('search_keywords')->nullable();
            $table->string('cover_media_url', 2048)->nullable();
            $table->json('gallery_media_urls')->nullable();
            $table->enum('availability', ['available', 'limited', 'unavailable', 'preorder'])->default('available');
            $table->decimal('public_price', 18, 2)->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->string('unit_label_ar', 120)->nullable();
            $table->string('unit_label_en', 120)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('published_by')->nullable()->index();
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_sync_error')->nullable();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();

            $table->unique(['merchant_id', 'product_id'], 'marketplace_publication_merchant_product_unique');
            $table->foreign('merchant_id')->references('id')->on('marketplace_merchants')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->restrictOnDelete();
            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_catalog_publications');
    }
};
