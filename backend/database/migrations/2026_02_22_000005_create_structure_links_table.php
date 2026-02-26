<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('structure_links', function (Blueprint $table) {
            $table->id();
            $table->uuid('source_node_uuid');
            $table->uuid('target_node_uuid');
            $table->unsignedBigInteger('topology_rule_id')->nullable();
            $table->string('link_type', 32)->default('assignment');
            $table->unsignedInteger('priority')->default(0);
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->unique(['source_node_uuid', 'target_node_uuid', 'link_type'], 'sl_source_target_type_unique');
            $table->foreign('source_node_uuid')
                ->references('node_uuid')
                ->on('structure_nodes')
                ->cascadeOnDelete();
            $table->foreign('target_node_uuid')
                ->references('node_uuid')
                ->on('structure_nodes')
                ->cascadeOnDelete();
            $table->foreign('topology_rule_id')
                ->references('id')
                ->on('topology_rules_matrix')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('structure_links');
    }
};
