<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('corporate_announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('content');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('target_audience', ['all', 'department', 'role', 'location', 'custom'])->default('all');
            $table->json('target_departments')->nullable();
            $table->json('target_roles')->nullable();
            $table->json('target_locations')->nullable();
            $table->json('target_employees')->nullable();
            $table->date('publish_date');
            $table->date('expiry_date')->nullable();
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('corporate_announcements');
    }
};

