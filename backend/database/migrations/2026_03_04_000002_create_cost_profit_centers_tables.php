<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Cost Centers ──────────────────────────────────────────────────
        Schema::create('cost_centers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();               // e.g. CC-001
            $table->string('name', 255);                        // Arabic / English name
            $table->string('name_en', 255)->nullable();         // Optional English name
            $table->unsignedBigInteger('parent_id')->nullable(); // Hierarchical
            $table->foreign('parent_id')->references('id')->on('cost_centers')->onDelete('set null');
            $table->foreignId('account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->decimal('budget', 15, 2)->nullable();
            $table->string('type', 30)->default('operational');  // operational, administrative, production, support
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('code');
            $table->index('parent_id');
            $table->index('is_active');
        });

        // ── Profit Centers ────────────────────────────────────────────────
        Schema::create('profit_centers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();               // e.g. PC-001
            $table->string('name', 255);
            $table->string('name_en', 255)->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->foreign('parent_id')->references('id')->on('profit_centers')->onDelete('set null');
            $table->foreignId('revenue_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('expense_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->decimal('revenue_target', 15, 2)->nullable();
            $table->decimal('expense_budget', 15, 2)->nullable();
            $table->string('type', 30)->default('business_unit'); // business_unit, product_line, region, branch
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('code');
            $table->index('parent_id');
            $table->index('is_active');
        });

        // ── Add cost/profit center references to General Ledger ───────────
        Schema::table('general_ledger', function (Blueprint $table) {
            $table->foreignId('cost_center_id')->nullable()->after('fiscal_period_id')
                  ->constrained('cost_centers')->nullOnDelete();
            $table->foreignId('profit_center_id')->nullable()->after('cost_center_id')
                  ->constrained('profit_centers')->nullOnDelete();

            $table->index('cost_center_id');
            $table->index('profit_center_id');
        });
    }

    public function down(): void
    {
        Schema::table('general_ledger', function (Blueprint $table) {
            $table->dropForeign(['cost_center_id']);
            $table->dropForeign(['profit_center_id']);
            $table->dropColumn(['cost_center_id', 'profit_center_id']);
        });

        Schema::dropIfExists('profit_centers');
        Schema::dropIfExists('cost_centers');
    }
};
