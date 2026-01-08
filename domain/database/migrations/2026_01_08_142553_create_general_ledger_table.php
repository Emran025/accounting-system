<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('general_ledger', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_number', 50)->index();
            $table->date('voucher_date');
            $table->foreignId('account_id')->constrained('chart_of_accounts')->onDelete('restrict');
            $table->string('entry_type', 10); // 'DEBIT' or 'CREDIT'
            $table->decimal('amount', 15, 2);
            $table->text('description')->nullable();
            $table->string('reference_type', 50)->nullable(); // table name e.g. 'invoices', 'purchases'
            $table->unsignedBigInteger('reference_id')->nullable(); // record id in reference table
            $table->foreignId('fiscal_period_id')->nullable()->constrained()->onDelete('set null');
            $table->boolean('is_closed')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('created_at')->useCurrent();
            $table->index('voucher_date');
            $table->index('account_id');
            $table->index('fiscal_period_id');
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('general_ledger');
    }
};
