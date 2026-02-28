<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Compliance Profiles – defines how tax/compliance data is transmitted
     * to a government entity or third-party authority.
     *
     * policy_type:
     *   "push" – Our system sends data to their endpoint (Policy 1)
     *   "pull" – They access our API via a generated token  (Policy 2)
     *
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        Schema::create('compliance_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_authority_id')
                  ->constrained('tax_authorities')
                  ->cascadeOnDelete();

            $table->string('name', 150)->comment('Human-readable profile name');
            $table->string('code', 40)->unique()->comment('Unique identifier e.g. ZATCA_VAT_PUSH');

            // ── Policy ──
            $table->enum('policy_type', ['push', 'pull'])
                  ->default('push')
                  ->comment('push = we send to them; pull = they fetch from us');

            // ── Transmission Format ──
            $table->enum('transmission_format', ['json', 'xml', 'yml', 'excel'])
                  ->default('json')
                  ->comment('Output format for the report');

            // ── Key Mapping ──
            // Stores the full mapping structure as JSON
            // e.g. { "our_key": "their_key", "invoice_number": "InvoiceID", ... }
            $table->json('key_mapping')->nullable()->comment('Maps our system keys → entity required keys');

            // ── Output Structure Template ──
            // The raw structure body (JSON/XML/YML string) with entity keys
            $table->longText('structure_template')->nullable()->comment('Full output structure in chosen format');

            // ── Policy 1 (Push) specific fields ──
            $table->string('endpoint_url')->nullable()->comment('Entity endpoint to push data to');
            $table->string('auth_type', 30)->nullable()->comment('none, bearer, basic, oauth2, api_key');
            $table->text('auth_credentials')->nullable()->comment('Encrypted credentials for push auth');
            $table->json('request_headers')->nullable()->comment('Custom HTTP headers for push requests');
            $table->string('http_method', 10)->default('POST')->comment('HTTP method: POST, PUT, PATCH');
            $table->json('openapi_spec')->nullable()->comment('OpenAPI/Swagger spec provided by entity');

            // ── Policy 2 (Pull) specific fields ──
            $table->string('access_token', 128)->nullable()->unique()->comment('Generated bearer token for pull access');
            $table->timestamp('token_expires_at')->nullable()->comment('Token expiration');
            $table->json('allowed_ips')->nullable()->comment('IP whitelist for pull access');
            $table->string('pull_endpoint_path', 100)->nullable()->comment('Custom path segment for pull endpoint');

            // ── Common ──
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('policy_type');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_profiles');
    }
};
