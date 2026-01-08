<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 50)->unique(); // INV, PUR, EXP, REV, etc.
            $table->string('prefix', 10)->default('');
            $table->integer('current_number')->default(0);
            $table->string('format', 50)->default('{PREFIX}-{NUMBER}');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sequences');
    }
};
