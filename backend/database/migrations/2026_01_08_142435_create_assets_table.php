<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->decimal('value', 12, 2);
            $table->date('purchase_date');
            $table->decimal('depreciation_rate', 5, 2)->default(0.00);
            $table->text('description')->nullable();
            $table->string('status', 50)->default('active'); // 'active' or 'disposed'
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
