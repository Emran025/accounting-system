<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_payroll_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_cycle_id')->constrained('payroll_cycles')->onDelete('cascade');
            $table->enum('integration_type', ['bank_file', 'gl_entry', 'third_party_pay', 'garnishment'])->default('bank_file');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'reconciled'])->default('pending');
            $table->string('file_path', 500)->nullable();
            $table->string('file_format', 50)->nullable(); // NACHA, SEPA, etc.
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->integer('transaction_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('reconciled_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_payroll_integrations');
    }
};

