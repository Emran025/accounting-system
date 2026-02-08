<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expat_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('expat_id')->constrained('expat_management')->onDelete('cascade');
            $table->enum('document_type', ['passport', 'visa', 'work_permit', 'residency', 'contract', 'other'])->default('other');
            $table->string('document_name', 255);
            $table->string('file_path', 500);
            $table->date('expiry_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expat_documents');
    }
};

