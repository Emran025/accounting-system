<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change template_type from enum to string to support more types dynamically
        Schema::table('document_templates', function (Blueprint $table) {
            $table->string('template_type', 255)->default('other')->change();
        });
        
        // Add a history table to maintain record of changes
        Schema::create('document_template_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_template_id')->constrained('document_templates')->cascadeOnDelete();
            $table->longText('body_html');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_template_histories');
        
        Schema::table('document_templates', function (Blueprint $table) {
            $table->string('template_type', 50)->default('other')->change();
        });
    }
};
