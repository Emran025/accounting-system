<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stores public transport-key lifecycle metadata only. Server private keys
     * are referenced by an external secret-store identifier and must never be
     * persisted in this database. Device private keys remain in the client
     * operating-system protected store.
     */
    public function up(): void
    {
        Schema::create('server_transport_keys', function (Blueprint $table): void {
            $table->id();
            $table->string('key_id', 96)->unique();
            $table->string('algorithm', 96);
            $table->text('public_key');
            $table->char('public_key_fingerprint', 64)->unique();
            $table->string('private_key_reference', 255);
            $table->string('state', 16)->default('active');
            $table->timestamp('activated_at');
            $table->timestamp('retire_after')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoked_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['state', 'activated_at'], 'server_transport_keys_state_index');
            $table->index(['retire_after', 'revoked_at'], 'server_transport_keys_lifecycle_index');
        });

        Schema::create('desktop_device_transport_keys', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('desktop_device_id')->constrained('desktop_devices')->cascadeOnDelete();
            $table->string('key_id', 96)->unique();
            $table->string('algorithm', 96);
            $table->text('public_key');
            $table->char('public_key_fingerprint', 64);
            $table->string('state', 16)->default('active');
            $table->timestamp('activated_at');
            $table->timestamp('retire_after')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoked_reason', 255)->nullable();
            $table->timestamps();

            $table->unique(['desktop_device_id', 'public_key_fingerprint'], 'desktop_transport_key_fingerprint_unique');
            $table->index(['desktop_device_id', 'state'], 'desktop_transport_keys_device_state_index');
            $table->index(['retire_after', 'revoked_at'], 'desktop_transport_keys_lifecycle_index');
        });

        Schema::create('sealed_transport_replay_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('desktop_device_id')->constrained('desktop_devices')->cascadeOnDelete();
            $table->string('key_id', 96);
            $table->string('direction', 24);
            $table->char('nonce_hash', 64);
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(
                ['desktop_device_id', 'key_id', 'direction', 'nonce_hash'],
                'sealed_transport_replay_token_unique'
            );
            $table->index(['expires_at'], 'sealed_transport_replay_expiry_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sealed_transport_replay_tokens');
        Schema::dropIfExists('desktop_device_transport_keys');
        Schema::dropIfExists('server_transport_keys');
    }
};
