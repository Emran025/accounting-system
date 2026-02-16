<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_assets', function (Blueprint $table) {
            $table->unsignedBigInteger('inventory_asset_id')->nullable()->after('employee_id');
            $table->enum('condition_on_return', ['good', 'damaged', 'needs_repair'])->nullable()->after('status');
            $table->text('condition_notes')->nullable()->after('condition_on_return');

            $table->foreign('inventory_asset_id')->references('id')->on('assets')->nullOnDelete();
        });

        // Add job_title_id to employees
        Schema::table('employees', function (Blueprint $table) {
            $table->unsignedBigInteger('job_title_id')->nullable()->after('role_id');
            $table->foreign('job_title_id')->references('id')->on('job_titles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employee_assets', function (Blueprint $table) {
            $table->dropForeign(['inventory_asset_id']);
            $table->dropColumn(['inventory_asset_id', 'condition_on_return', 'condition_notes']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['job_title_id']);
            $table->dropColumn('job_title_id');
        });
    }
};
