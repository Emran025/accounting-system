<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('structure_nodes', function (Blueprint $table) {
            $table->uuid('node_uuid')->primary();
            $table->string('node_type_id', 32);
            $table->string('code', 32);
            $table->json('attributes_json')->nullable();
            $table->string('status', 20)->default('active'); // active, inactive, archived
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['node_type_id', 'code']);
            $table->foreign('node_type_id')
                ->references('id')
                ->on('org_meta_types')
                ->cascadeOnDelete();
            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('structure_nodes');
    }
};
