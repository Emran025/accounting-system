<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contingent_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('contingent_workers')->onDelete('cascade');
            $table->string('contract_number', 50)->unique();
            $table->date('contract_start_date');
            $table->date('contract_end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'expired', 'terminated', 'renewed'])->default('draft');
            $table->text('contract_terms')->nullable();
            $table->string('file_path', 500)->nullable();
            $table->decimal('total_value', 15, 2)->nullable();
            $table->text('renewal_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contingent_contracts');
    }
};

