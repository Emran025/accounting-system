<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('org_change_history', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type', 32); // node, link, meta_type, topology_rule
            $table->string('entity_id', 64);   // UUID for nodes, ID for links
            $table->string('change_type', 20);  // created, updated, deleted, status_change
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('change_reason')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamps();

            $table->foreign('changed_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->index(['entity_type', 'entity_id']);
            $table->index('change_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('org_change_history');
    }
};
