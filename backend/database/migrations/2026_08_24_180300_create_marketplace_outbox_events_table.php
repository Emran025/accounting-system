<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_outbox_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('merchant_id')->nullable()->index();
            $table->string('aggregate_type', 80);
            $table->uuid('aggregate_id');
            $table->string('event_type', 120)->index();
            $table->unsignedInteger('aggregate_revision');
            $table->string('idempotency_key', 200)->unique();
            $table->json('payload');
            $table->enum('status', ['pending', 'processing', 'delivered', 'failed'])->default('pending')->index();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('available_at')->useCurrent()->index();
            $table->timestamp('delivered_at')->nullable();
            $table->string('remote_receipt_id', 100)->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['status', 'available_at'], 'marketplace_outbox_delivery_index');
            $table->foreign('merchant_id')->references('id')->on('marketplace_merchants')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_outbox_events');
    }
};
