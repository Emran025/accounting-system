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
            // Check if unique index doesn't already exist using the helper
            if (!$this->indexExists('chart_of_accounts', 'chart_of_accounts_account_code_unique')) {
                $table->unique('account_code', 'chart_of_accounts_account_code_unique');
            }
        });

        // Add check constraint for non-negative amounts in general_ledger
        // Note: MySQL 8.0.16+ supports CHECK constraints
        // For older MySQL versions, this will need to be handled at application level
        if (DB::getDriverName() === 'mysql') {
            $version = DB::select('SELECT VERSION() as version')[0]->version;
            if (version_compare($version, '8.0.16', '>=')) {
                DB::statement('ALTER TABLE general_ledger ADD CONSTRAINT chk_amount_positive CHECK (amount > 0)');
            }
        } elseif (DB::getDriverName() === 'pgsql') {
            // PostgreSQL supports CHECK constraints
            DB::statement('ALTER TABLE general_ledger ADD CONSTRAINT chk_amount_positive CHECK (amount > 0)');
        } elseif (DB::getDriverName() === 'sqlite') {
            // MySQL supports CHECK constraints since 3.3.0
            // Note: In MySQL, adding a CHECK constraint via ALTER TABLE is restricted.
            // Usually requires table recreation or defined at table creation.
            // We'll skip for now or use raw statement if it works on the specific fly.
        }

        // Add check constraint for non-negative quantities in inventory_costing
        if (DB::getDriverName() === 'mysql' && version_compare(DB::select('SELECT VERSION() as version')[0]->version, '8.0.16', '>=')) {
            DB::statement('ALTER TABLE inventory_costing ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)');
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE inventory_costing ADD CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)');
        }
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
                DB::statement('ALTER TABLE general_ledger DROP CHECK chk_amount_positive');
                DB::statement('ALTER TABLE inventory_costing DROP CHECK chk_quantity_positive');
            }
        } elseif (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE general_ledger DROP CONSTRAINT chk_amount_positive');
            DB::statement('ALTER TABLE inventory_costing DROP CONSTRAINT chk_quantity_positive');
        }

        // Remove unique constraint
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            if ($this->indexExists('chart_of_accounts', 'chart_of_accounts_account_code_unique')) {
                $table->dropUnique('chart_of_accounts_account_code_unique');
            }
        });

        // Remove index
        Schema::table('general_ledger', function (Blueprint $table) {
            if ($this->indexExists('general_ledger', 'general_ledger_reference_index')) {
                $table->dropIndex('general_ledger_reference_index');
            }
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
        } elseif ($driver === 'sqlite') {
            $indexes = DB::select("PRAGMA index_list('{$table}')");
            foreach ($indexes as $index) {
                if ($index->name === $indexName) {
                    return true;
                }
            }
            return false;
        }
        
        return false;
    }
};

