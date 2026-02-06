<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            // Rename value to purchase_value for clarity and consistency with DepreciationService
            if (Schema::hasColumn('assets', 'value') && !Schema::hasColumn('assets', 'purchase_value')) {
                $table->renameColumn('value', 'purchase_value');
            }

            // Add missing columns required by DepreciationService
            $table->decimal('salvage_value', 15, 2)->after('purchase_value')->default(0);
            $table->integer('useful_life_years')->after('salvage_value')->default(5);
            $table->string('depreciation_method')->after('useful_life_years')->default('straight_line');
            $table->decimal('accumulated_depreciation', 15, 2)->after('depreciation_method')->default(0);
            $table->boolean('is_active')->after('status')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn([
                'salvage_value',
                'useful_life_years',
                'depreciation_method',
                'accumulated_depreciation',
                'is_active',
            ]);
            
            if (Schema::hasColumn('assets', 'purchase_value')) {
                $table->renameColumn('purchase_value', 'value');
            }
        });
    }
};
