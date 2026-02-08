<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('onboarding_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('onboarding_workflows')->onDelete('cascade');
            $table->string('document_name', 255);
            $table->enum('document_type', ['i9', 'w4', 'direct_deposit', 'nda', 'contract', 'policy', 'other'])->default('other');
            $table->string('file_path', 500)->nullable();
            $table->enum('status', ['pending', 'sent', 'signed', 'completed'])->default('pending');
            $table->string('electronic_signature', 500)->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_documents');
    }
};

