<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tax authorities (ZATCA, FTA, etc.) - one implementation per jurisdiction.
     * Part of EPIC #1: Tax Engine Transformation.
     */
    public function up(): void
    {
        Schema::create('tax_authorities', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique()->comment('e.g. ZATCA, FTA_UAE');
            $table->string('name', 100);
            $table->string('country_code', 2)->default('SA')->comment('ISO 3166-1 alpha-2');
            $table->string('adapter_class')->nullable()->comment('FQCN for TaxAuthorityInterface impl');
            $table->json('config')->nullable()->comment('Adapter-specific config');
            $table->string('connection_type', 20)->default('push_api')->comment('push_api (e.g ZATCA), pull_key, none');
            $table->text('connection_credentials')->nullable()->comment('Encrypted OAuth tokens or API keys');
            $table->string('endpoint_url')->nullable()->comment('Base URL for government endpoints');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_primary')->default(false)->comment('Primary for jurisdiction');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_authorities');
    }
};
