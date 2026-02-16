<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->string('template_key', 50)->unique();
            $table->string('template_name_ar');
            $table->string('template_name_en')->nullable();
            $table->enum('template_type', ['contract', 'clearance', 'warning', 'id_card', 'handover', 'certificate', 'memo', 'other'])->default('other');
            $table->longText('body_html');
            $table->json('editable_fields')->nullable();
            $table->string('description', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_templates');
    }
};
