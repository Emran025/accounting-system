<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChartOfAccount;

class GovernmentFeesAccountSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure "Government Liabilities" Group exists under Liabilities (2000)
        // Check if 2000 exists
        $liabilities = ChartOfAccount::where('account_code', '2000')->first();
        if (!$liabilities) {
             $liabilities = ChartOfAccount::create(['account_code' => '2000', 'account_name' => 'الخصوم', 'account_type' => 'Liability']);
        }

        $govLiabilities = ChartOfAccount::updateOrCreate(
            ['account_code' => '2300'],
            [
                'account_name' => 'الالتزامات الحكومية (الخراج)',
                'account_type' => 'Liability',
                'parent_id' => $liabilities->id
            ]
        );

        // 2. Create a default Sub-Account "General Government Fees"
        $generalFees = ChartOfAccount::updateOrCreate(
            ['account_code' => '2310'],
            [
                'account_name' => 'رسوم حكومية عامة',
                'account_type' => 'Liability',
                'parent_id' => $govLiabilities->id
            ]
        );
    }
}
