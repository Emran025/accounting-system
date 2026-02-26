<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('topology_rules_matrix', function (Blueprint $table) {
            $table->id();
            $table->string('source_node_type_id', 32);
            $table->string('target_node_type_id', 32);
            $table->string('cardinality', 8)->default('N:1'); // 1:1, 1:N, N:1, N:M
            $table->string('link_direction', 20)->default('source_to_target');
            $table->json('constraint_logic')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('source_node_type_id')
                ->references('id')
                ->on('org_meta_types')
                ->cascadeOnDelete();
            $table->foreign('target_node_type_id')
                ->references('id')
                ->on('org_meta_types')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topology_rules_matrix');
    }
};
