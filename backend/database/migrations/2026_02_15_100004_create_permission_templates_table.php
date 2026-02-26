<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permission_templates', function (Blueprint $table) {
            $table->id();
            $table->string('template_name');
            $table->string('template_key')->unique();
            $table->text('description')->nullable();
            $table->json('permissions'); // stored as JSON array of { module_key, can_view, can_create, can_edit, can_delete }
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        // Add permission_policy column to settings if it doesn't exist
        // The policy: 'role_based', 'department_based', 'individual_based'
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_templates');
    }
};
