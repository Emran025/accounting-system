<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_base', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('content');
            $table->enum('category', ['policy', 'procedure', 'best_practice', 'faq', 'training', 'other'])->default('other');
            $table->json('tags')->nullable();
            $table->string('file_path', 500)->nullable();
            $table->integer('view_count')->default(0);
            $table->integer('helpful_count')->default(0);
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_base');
    }
};

