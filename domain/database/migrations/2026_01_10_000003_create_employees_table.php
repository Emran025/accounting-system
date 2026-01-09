<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_code', 50)->unique();
            $table->string('full_name', 100);
            $table->string('email', 100)->unique();
            $table->string('password'); // For employee portal access
            $table->string('phone', 20)->nullable();
            $table->string('national_id', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->text('address')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->enum('employment_status', ['active', 'suspended', 'terminated'])->default('active');
            $table->decimal('base_salary', 15, 2)->default(0);
            
            // Added consolidated accounting/HR fields:
            $table->string('gosi_number', 50)->nullable();
            $table->string('iban', 34)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->decimal('vacation_days_balance', 8, 2)->default(0);
            $table->enum('contract_type', ['full_time', 'part_time', 'contract', 'freelance'])->default('full_time');

            $table->foreignId('account_id')->nullable()->constrained('chart_of_accounts')->onDelete('set null');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Added consolidated fields:
            $table->foreignId('role_id')->nullable()->constrained('roles')->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('manager_id')->nullable()->constrained('employees')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
