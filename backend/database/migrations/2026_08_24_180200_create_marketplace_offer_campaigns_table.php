<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_offer_campaigns', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('merchant_id')->index();
            $table->string('slug', 160)->unique();
            $table->string('title_ar', 255);
            $table->string('title_en', 255)->nullable();
            $table->text('summary_ar')->nullable();
            $table->text('summary_en')->nullable();
            $table->text('disclosure_ar')->nullable();
            $table->text('disclosure_en')->nullable();
            $table->enum('benefit_type', ['percentage', 'fixed_amount', 'fixed_price', 'bundle', 'gift']);
            $table->decimal('benefit_value', 18, 2)->default(0);
            $table->char('currency_code', 3)->nullable();
            $table->string('hero_media_url', 2048)->nullable();
            $table->json('targets');
            $table->timestamp('starts_at')->index();
            $table->timestamp('ends_at')->index();
            $table->string('timezone', 64)->default('UTC');
            $table->enum('status', ['draft', 'in_review', 'approved', 'scheduled', 'published', 'expired', 'withdrawn', 'rejected'])->default('draft')->index();
            $table->timestamp('published_at')->nullable();
            $table->unsignedBigInteger('published_by')->nullable()->index();
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_sync_error')->nullable();
            $table->unsignedInteger('revision')->default(1);
            $table->timestamps();

            $table->foreign('merchant_id')->references('id')->on('marketplace_merchants')->cascadeOnDelete();
            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_offer_campaigns');
    }
};
