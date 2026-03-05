<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add bidirectional link fields between relational tables (cost_centers,
 * profit_centers, departments) and the org-chart polymorphic structure.
 *
 * Also add cost/profit centre references to departments so a department
 * can be associated with specific cost/profit centres.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Cost Centers: link to org-chart node ─────────────────────────
        Schema::table('cost_centers', function (Blueprint $table) {
            $table->uuid('structure_node_uuid')->nullable()->after('id');
            $table->index('structure_node_uuid');
        });

        // ── Profit Centers: link to org-chart node ──────────────────────
        Schema::table('profit_centers', function (Blueprint $table) {
            $table->uuid('structure_node_uuid')->nullable()->after('id');
            $table->index('structure_node_uuid');
        });

        // ── Departments: link to cost/profit centres ────────────────────
        Schema::table('departments', function (Blueprint $table) {
            $table->foreignId('cost_center_id')->nullable()->after('manager_id')
                  ->constrained('cost_centers')->nullOnDelete();
            $table->foreignId('profit_center_id')->nullable()->after('cost_center_id')
                  ->constrained('profit_centers')->nullOnDelete();
        });

        // ── Positions: link to cost centre for allocation ───────────────
        Schema::table('positions', function (Blueprint $table) {
            $table->foreignId('cost_center_id')->nullable()->after('department_id')
                  ->constrained('cost_centers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropForeign(['cost_center_id']);
            $table->dropColumn('cost_center_id');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropForeign(['cost_center_id']);
            $table->dropForeign(['profit_center_id']);
            $table->dropColumn(['cost_center_id', 'profit_center_id']);
        });

        Schema::table('profit_centers', function (Blueprint $table) {
            $table->dropColumn('structure_node_uuid');
        });

        Schema::table('cost_centers', function (Blueprint $table) {
            $table->dropColumn('structure_node_uuid');
        });
    }
};
