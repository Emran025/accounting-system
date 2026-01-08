<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('batch_processing', function (Blueprint $table) {
            $table->id();
            $table->string('batch_name', 100);
            $table->string('batch_type', 50); // journal_entry_import, expense_posting
            $table->text('description')->nullable();
            $table->string('status', 20)->default('pending'); // pending, processing, completed, completed_with_errors, failed
            $table->integer('total_items')->default(0);
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('batch_processing');
    }
};
