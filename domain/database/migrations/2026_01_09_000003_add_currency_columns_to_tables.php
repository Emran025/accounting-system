<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->decimal('exchange_rate', 12, 4)->nullable();
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->decimal('exchange_rate', 12, 4)->nullable();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('purchase_currency_id')->nullable()->constrained('currencies')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropColumn(['currency_id', 'exchange_rate']);
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropColumn(['currency_id', 'exchange_rate']);
        });

        Schema::table('products', function (Blueprint $table) {
             $table->dropForeign(['purchase_currency_id']);
             $table->dropColumn(['purchase_currency_id']);
        });
    }
};
