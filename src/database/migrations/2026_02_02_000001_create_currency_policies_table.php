<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Currency Policy Configuration Table
 * 
 * This migration implements the Policy-Driven Currency Framework as defined in
 * the Multi-Currency Architecture report. Currency behavior is externalized 
 * from transaction mechanics and governed explicitly by configurable policies.
 * 
 * @see reports/Multi_Currency_System_Final_Report.md
 */
return new class extends Migration
{
    public function up(): void
    {
        // Currency Policy Configuration - Master Policy Settings
        Schema::create('currency_policies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('code', 20)->unique(); // POLICY_A, POLICY_B, POLICY_C
            $table->text('description')->nullable();
            
            /*
             * Policy Type:
             * - UNIT_OF_MEASURE (Policy A): Currencies as independent units, no conversion implied
             * - VALUED_ASSET (Policy B): Currencies as conditionally convertible assets
             * - NORMALIZATION (Policy C): Immediate conversion to reference currency
             */
            $table->enum('policy_type', ['UNIT_OF_MEASURE', 'VALUED_ASSET', 'NORMALIZATION'])
                ->default('NORMALIZATION');
            
            // Whether a reference (base/functional) currency is required
            $table->boolean('requires_reference_currency')->default(true);
            
            // Whether foreign currencies may be held as independent ledger balances
            $table->boolean('allow_multi_currency_balances')->default(false);
            
            // When conversion occurs (POSTING, SETTLEMENT, REPORTING, NEVER)
            $table->enum('conversion_timing', ['POSTING', 'SETTLEMENT', 'REPORTING', 'NEVER'])
                ->default('POSTING');
            
            // Whether revaluation applies
            $table->boolean('revaluation_enabled')->default(false);
            
            // Revaluation frequency if enabled (DAILY, WEEKLY, MONTHLY, PERIOD_END)
            $table->enum('revaluation_frequency', ['DAILY', 'WEEKLY', 'MONTHLY', 'PERIOD_END'])
                ->nullable();
            
            // Exchange rate source (MANUAL, CENTRAL_BANK, API)
            $table->enum('exchange_rate_source', ['MANUAL', 'CENTRAL_BANK', 'API'])
                ->default('MANUAL');
            
            // Whether this is the active/default policy
            $table->boolean('is_active')->default(false);
            
            $table->timestamps();
            $table->softDeletes();
        });

        // Currency Exchange Rate History - Preserves historical rates for auditing
        Schema::create('currency_exchange_rate_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('currency_id')->constrained('currencies')->onDelete('cascade');
            $table->foreignId('target_currency_id')->constrained('currencies')->onDelete('cascade');
            $table->decimal('exchange_rate', 18, 8); // High precision for currency rates
            $table->date('effective_date');
            $table->time('effective_time')->nullable();
            $table->enum('source', ['MANUAL', 'CENTRAL_BANK', 'API', 'SYSTEM'])->default('MANUAL');
            $table->string('source_reference', 255)->nullable(); // External reference ID
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Unique constraint per currency pair per day
            $table->unique(['currency_id', 'target_currency_id', 'effective_date'], 'unique_rate_per_day');
            $table->index(['currency_id', 'effective_date']);
        });

        // Transaction Currency Context - Temporal Policy Binding
        // Each transaction carries its currency treatment context at creation time
        Schema::create('transaction_currency_contexts', function (Blueprint $table) {
            $table->id();
            
            // Polymorphic reference to the source transaction
            $table->string('transaction_type', 50); // invoices, purchases, expenses, etc.
            $table->unsignedBigInteger('transaction_id');
            
            // Currency Policy at time of transaction
            $table->foreignId('currency_policy_id')
                ->constrained('currency_policies')
                ->onDelete('restrict');
            
            // Transaction Currency (contractual/primary currency of the transaction)
            $table->foreignId('transaction_currency_id')
                ->constrained('currencies')
                ->onDelete('restrict');
            
            // Transaction amount in original currency
            $table->decimal('transaction_amount', 18, 4);
            
            // Reference Currency at time of transaction (if applicable)
            $table->foreignId('reference_currency_id')
                ->nullable()
                ->constrained('currencies')
                ->onDelete('restrict');
            
            // Exchange rate at transaction time (if converted)
            $table->decimal('exchange_rate_at_posting', 18, 8)->nullable();
            
            // Converted amount in reference currency (if applicable)
            $table->decimal('reference_amount', 18, 4)->nullable();
            
            // Whether conversion was applied at posting
            $table->boolean('converted_at_posting')->default(false);
            
            // Conversion decision: WHY the conversion policy was applied
            $table->enum('conversion_decision', [
                'POLICY_MANDATED',      // Policy Type C - immediate conversion
                'USER_REQUESTED',       // Manual conversion by user
                'SAME_CURRENCY',        // No conversion needed
                'DEFERRED',             // Policy Type A/B - no conversion at posting
                'EXEMPTED'              // Special exemption applies
            ])->default('POLICY_MANDATED');
            
            // Metadata for audit trail
            $table->json('policy_snapshot')->nullable(); // Captures policy state at transaction time
            
            $table->timestamps();
            
            // Ensure one context per transaction
            $table->unique(['transaction_type', 'transaction_id'], 'unique_transaction_context');
            $table->index(['transaction_currency_id', 'created_at']);
        });

        // Multi-Currency Ledger Extension
        // Extends general_ledger to support multi-currency balances
        Schema::create('currency_ledger_entries', function (Blueprint $table) {
            $table->id();
            
            // Reference to the original general ledger entry
            $table->foreignId('general_ledger_id')
                ->constrained('general_ledger')
                ->onDelete('cascade');
            
            // Currency this entry is denominated in
            $table->foreignId('currency_id')
                ->constrained('currencies')
                ->onDelete('restrict');
            
            // Amount in original currency
            $table->decimal('original_amount', 18, 4);
            
            // Exchange rate used (if any conversion)
            $table->decimal('exchange_rate', 18, 8)->nullable();
            
            // Amount in reference currency (if converted)
            $table->decimal('reference_amount', 18, 4)->nullable();
            
            // Whether this entry was revalued
            $table->boolean('is_revalued')->default(false);
            $table->timestamp('last_revaluation_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['general_ledger_id', 'currency_id']);
            $table->index(['currency_id', 'created_at']);
        });

        // Currency Revaluation Journal
        // Tracks revaluation events for foreign currency balances
        Schema::create('currency_revaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fiscal_period_id')
                ->nullable()
                ->constrained('fiscal_periods')
                ->onDelete('set null');
            $table->foreignId('currency_id')
                ->constrained('currencies')
                ->onDelete('restrict');
            $table->foreignId('account_id')
                ->constrained('chart_of_accounts')
                ->onDelete('restrict');
            
            // Previous and new rates
            $table->decimal('previous_rate', 18, 8);
            $table->decimal('new_rate', 18, 8);
            
            // Balances
            $table->decimal('foreign_balance', 18, 4);
            $table->decimal('previous_reference_balance', 18, 4);
            $table->decimal('new_reference_balance', 18, 4);
            
            // Gain/Loss
            $table->decimal('revaluation_amount', 18, 4);
            $table->enum('revaluation_type', ['GAIN', 'LOSS']);
            
            // Journal entry reference
            $table->string('voucher_number', 50)->nullable()->index();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->index(['currency_id', 'created_at']);
            $table->index(['fiscal_period_id', 'currency_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currency_revaluations');
        Schema::dropIfExists('currency_ledger_entries');
        Schema::dropIfExists('transaction_currency_contexts');
        Schema::dropIfExists('currency_exchange_rate_history');
        Schema::dropIfExists('currency_policies');
    }
};
