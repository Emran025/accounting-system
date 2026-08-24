<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_quotations', function (Blueprint $table): void {
            $table->uuid('marketplace_inquiry_id')->nullable()->unique()->after('customer_id');
            $table->foreign('marketplace_inquiry_id')
                ->references('id')
                ->on('marketplace_inquiries')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sales_quotations', function (Blueprint $table): void {
            $table->dropForeign(['marketplace_inquiry_id']);
            $table->dropUnique(['marketplace_inquiry_id']);
            $table->dropColumn('marketplace_inquiry_id');
        });
    }
};
