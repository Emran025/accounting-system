<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_inbound_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('remote_event_id', 120)->unique();
            $table->string('event_type', 120)->index();
            $table->string('contract_version', 80);
            $table->timestamp('occurred_at')->nullable()->index();
            $table->char('payload_sha256', 64);
            $table->json('payload');
            $table->enum('status', ['received', 'processing', 'processed', 'rejected', 'failed'])->default('received')->index();
            $table->string('handled_type', 80)->nullable();
            $table->string('handled_id', 120)->nullable();
            $table->uuid('receipt_id')->unique();
            $table->text('last_error')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['event_type', 'status'], 'marketplace_inbound_event_work_index');
        });

        Schema::create('marketplace_daily_metrics', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('metric_key', 191)->unique();
            $table->uuid('merchant_id')->nullable()->index();
            $table->uuid('publication_id')->nullable()->index();
            $table->uuid('offer_id')->nullable()->index();
            $table->date('metric_date')->index();
            $table->string('source', 60)->default('operational')->index();
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('detail_views')->default(0);
            $table->unsignedBigInteger('inquiries')->default(0);
            $table->unsignedBigInteger('conversion_count')->default(0);
            $table->timestamps();

            $table->foreign('merchant_id')->references('id')->on('marketplace_merchants')->nullOnDelete();
            $table->foreign('publication_id')->references('id')->on('marketplace_catalog_publications')->nullOnDelete();
            $table->foreign('offer_id')->references('id')->on('marketplace_offer_campaigns')->nullOnDelete();
            $table->index(['metric_date', 'merchant_id'], 'marketplace_metric_merchant_date_index');
        });

        Schema::create('marketplace_audit_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('event_type', 120)->index();
            $table->string('subject_type', 100)->index();
            $table->string('subject_id', 120)->index();
            $table->unsignedBigInteger('actor_id')->nullable()->index();
            $table->json('before_state')->nullable();
            $table->json('after_state')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at')->useCurrent()->index();
            $table->timestamps();

            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['subject_type', 'subject_id', 'occurred_at'], 'marketplace_audit_subject_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_audit_logs');
        Schema::dropIfExists('marketplace_daily_metrics');
        Schema::dropIfExists('marketplace_inbound_events');
    }
};
