<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compensation_plans', function (Blueprint $table) {
            $table->id();
            $table->string('plan_name', 255);
            $table->enum('plan_type', ['merit', 'promotion', 'adjustment', 'bonus', 'commission'])->default('merit');
            $table->string('fiscal_year', 10);
            $table->date('effective_date');
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'active', 'closed'])->default('draft');
            $table->decimal('budget_pool', 15, 2)->default(0);
            $table->decimal('allocated_amount', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compensation_plans');
    }
};

