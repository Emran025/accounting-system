<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_cycles', function (Blueprint $table) {
            $table->id();
            $table->string('cycle_name', 100);
            $table->string('cycle_type', 30)->default('salary'); // salary, bonus, incentive, other
            $table->text('description')->nullable();
            $table->date('period_start');
            $table->date('period_end');
            $table->date('payment_date');
            
            // Workflow Status
            $table->enum('status', ['draft', 'pending_approval', 'processing', 'approved', 'paid'])->default('draft');
            $table->foreignId('current_approver_id')->nullable()->constrained('users')->onDelete('set null');
            $table->json('approval_trail')->nullable();

            $table->decimal('total_gross', 15, 2)->default(0);
            $table->decimal('total_deductions', 15, 2)->default(0);
            $table->decimal('total_net', 15, 2)->default(0);
            
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('approved_at')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_cycles');
    }
};
