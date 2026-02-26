<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_contracts', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_contracts', 'contract_number')) {
                $table->string('contract_number', 50)->unique()->nullable()->after('id');
            }
            if (!Schema::hasColumn('employee_contracts', 'contract_file_path')) {
                $table->string('contract_file_path', 500)->nullable()->after('notes');
            }
            if (!Schema::hasColumn('employee_contracts', 'probation_end_date')) {
                $table->date('probation_end_date')->nullable()->after('contract_end_date');
            }
            if (!Schema::hasColumn('employee_contracts', 'renewal_reminder_sent')) {
                $table->boolean('renewal_reminder_sent')->default(false)->after('is_current');
            }
            if (!Schema::hasColumn('employee_contracts', 'signing_bonus')) {
                $table->decimal('signing_bonus', 10, 2)->default(0)->after('base_salary');
            }
            if (!Schema::hasColumn('employee_contracts', 'retention_allowance')) {
                $table->decimal('retention_allowance', 10, 2)->default(0)->after('signing_bonus');
            }
            if (!Schema::hasColumn('employee_contracts', 'nda_signed')) {
                $table->boolean('nda_signed')->default(false)->after('is_current');
            }
            if (!Schema::hasColumn('employee_contracts', 'non_compete_signed')) {
                $table->boolean('non_compete_signed')->default(false)->after('nda_signed');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_contracts', function (Blueprint $table) {
            $table->dropColumn([
                'contract_number',
                'contract_file_path',
                'probation_end_date',
                'renewal_reminder_sent',
                'signing_bonus',
                'retention_allowance',
                'nda_signed',
                'non_compete_signed'
            ]);
        });
    }
};

