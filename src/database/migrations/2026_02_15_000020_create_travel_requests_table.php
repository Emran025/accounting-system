<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('travel_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number', 50)->unique();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'completed'])->default('draft');
            $table->string('destination', 255);
            $table->text('purpose');
            $table->date('departure_date');
            $table->date('return_date');
            $table->decimal('estimated_cost', 10, 2)->default(0);
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('travel_requests');
    }
};

