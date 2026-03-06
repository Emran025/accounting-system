<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nr_objects', function (Blueprint $table) {
            $table->id();
            $table->string('object_type', 50)->unique();          // employees, customers, suppliers, products, cost_centers, accounts, etc.
            $table->string('name');                                 // Arabic display name
            $table->string('name_en')->nullable();                 // English display name
            $table->string('description')->nullable();             // Purpose / notes
            $table->unsignedTinyInteger('number_length')->default(8); // Total digit length for generated numbers
            $table->string('prefix', 10)->nullable();              // Optional prefix (EMP-, CUST-, etc.)
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nr_objects');
    }
};
