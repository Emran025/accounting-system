<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('org_meta_type_attributes', function (Blueprint $table) {
            $table->id();
            $table->string('org_meta_type_id', 32);
            $table->string('attribute_key', 64);
            $table->string('attribute_type', 20)->default('string'); // string, uuid, integer, json
            $table->boolean('is_mandatory')->default(false);
            $table->text('default_value')->nullable();
            $table->json('validation_rule')->nullable();
            $table->string('reference_type_id', 32)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('org_meta_type_id')
                ->references('id')
                ->on('org_meta_types')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_meta_type_attributes');
    }
};
