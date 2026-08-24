<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_inquiries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('remote_inquiry_id', 120)->nullable()->unique();
            $table->uuid('merchant_id')->nullable()->index();
            $table->string('source', 40)->default('operational')->index();
            $table->string('channel', 40)->nullable()->index();
            $table->enum('status', ['new', 'assigned', 'qualified', 'quoted', 'converted', 'lost', 'cancelled'])->default('new')->index();
            $table->string('customer_name', 255)->nullable();
            $table->string('customer_email', 255)->nullable()->index();
            $table->string('customer_phone', 60)->nullable()->index();
            $table->string('preferred_language', 12)->nullable();
            $table->text('message')->nullable();
            $table->timestamp('requested_at')->nullable()->index();
            $table->unsignedBigInteger('assigned_to')->nullable()->index();
            $table->timestamp('assigned_at')->nullable();
            $table->unsignedBigInteger('qualified_by')->nullable()->index();
            $table->timestamp('qualified_at')->nullable();
            $table->string('conversion_type', 50)->nullable()->index();
            $table->string('conversion_id', 120)->nullable()->index();
            $table->unsignedBigInteger('converted_by')->nullable()->index();
            $table->timestamp('converted_at')->nullable();
            $table->string('lost_reason', 500)->nullable();
            $table->json('source_payload')->nullable();
            $table->timestamps();

            $table->foreign('merchant_id')->references('id')->on('marketplace_merchants')->nullOnDelete();
            $table->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $table->foreign('qualified_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('converted_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['status', 'requested_at'], 'marketplace_inquiry_work_queue_index');
        });

        Schema::create('marketplace_inquiry_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('inquiry_id')->index();
            $table->uuid('publication_id')->nullable()->index();
            $table->uuid('offer_id')->nullable()->index();
            $table->unsignedBigInteger('product_id')->nullable()->index();
            $table->enum('item_kind', ['product', 'service'])->default('product');
            $table->string('public_title', 255)->nullable();
            $table->decimal('requested_quantity', 14, 3)->default(1);
            $table->decimal('public_unit_price', 18, 2)->nullable();
            $table->char('currency_code', 3)->nullable();
            $table->json('source_snapshot')->nullable();
            $table->timestamps();

            $table->foreign('inquiry_id')->references('id')->on('marketplace_inquiries')->cascadeOnDelete();
            $table->foreign('publication_id')->references('id')->on('marketplace_catalog_publications')->nullOnDelete();
            $table->foreign('offer_id')->references('id')->on('marketplace_offer_campaigns')->nullOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_inquiry_items');
        Schema::dropIfExists('marketplace_inquiries');
    }
};
