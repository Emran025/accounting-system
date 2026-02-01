<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * CRITICAL FIX: Adds database-level constraints to prevent:
     * - Negative amounts in financial records
     * - Duplicate account codes
     * - Data integrity violations
     */
    public function up(): void
    {
        // Add unique constraint on chart_of_accounts.account_code at database level
        // (Currently only enforced at application level)
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            // Check if unique index doesn't already exist
            $indexes = DB::select("SHOW INDEXES FROM chart_of_accounts WHERE Key_name = 'chart_of_accounts_account_code_unique'");
            if (empty($indexes)) {
                $table->unique('account_code', 'chart_of_accounts_account_code_unique');
            }
        });

        // Add check constraint for non-negative amounts in general_ledgers
        // Note: MySQL 8.0.16+ supports CHECK constraints
        // For older MySQL versions, this will need to be handled at application level
        if (DB::getDriverName() === 'mysql') {
            $version = DB::select('SELECT VERSION() as version')[0]->version;
            if (version_compare($version, '8.0.16', '>=')) {
                DB::statement('ALTER TABLE general_ledgers ADD CONSTRAINT chk_amount_positive CHECK (amount > 0)');
            }
        } elseif (DB::getDriverName() === 'pgsql') {
            // PostgreSQL supports CHECK constraints
            DB::statement('ALTER TABLE general_ledgers ADD CONSTRAINT chk_amount_positive CHECK (amount > 0)');
        }

        // Add check constraint for non-negative quantities in inventory_costing
        if (DB::getDriverName() === 'mysql' && version_compare(DB::select('SELECT VERSION() as version')[0]->version, '8.0.16', '>=')) {
            DB::statement('ALTER TABLE inventory_costing ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)');
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE inventory_costing ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)');
        }

        // Add index on polymorphic reference columns for better query performance
        Schema::table('general_ledgers', function (Blueprint $table) {
            if (!$this->indexExists('general_ledgers', 'general_ledgers_reference_index')) {
                $table->index(['reference_type', 'reference_id'], 'general_ledgers_reference_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove check constraints
        if (DB::getDriverName() === 'mysql') {
            $version = DB::select('SELECT VERSION() as version')[0]->version;
            if (version_compare($version, '8.0.16', '>=')) {
                DB::statement('ALTER TABLE general_ledgers DROP CHECK chk_amount_positive');
                DB::statement('ALTER TABLE inventory_costing DROP CHECK chk_quantity_positive');
            }
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE general_ledgers DROP CONSTRAINT chk_amount_positive');
            DB::statement('ALTER TABLE inventory_costing DROP CONSTRAINT chk_quantity_positive');
        }

        // Remove unique constraint
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropUnique('chart_of_accounts_account_code_unique');
        });

        // Remove index
        Schema::table('general_ledgers', function (Blueprint $table) {
            $table->dropIndex('general_ledgers_reference_index');
        });
    }

    /**
     * Check if an index exists on a table
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $driver = DB::getDriverName();
        
        if ($driver === 'mysql') {
            $indexes = DB::select("SHOW INDEXES FROM {$table} WHERE Key_name = ?", [$indexName]);
            return !empty($indexes);
        } elseif ($driver === 'pgsql') {
            $indexes = DB::select(
                "SELECT indexname FROM pg_indexes WHERE tablename = ? AND indexname = ?",
                [$table, $indexName]
            );
            return !empty($indexes);
        }
        
        return false;
    }
};

