<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\ChartOfAccount;

try {
    $acc4100 = ChartOfAccount::where('account_code', '4100')->first();
    if ($acc4100) {
        $acc4100->update(['account_name' => 'مجموعة المبيعات']);
        echo "Updated 4100 name to: مجموعة المبيعات<br>";
    } else {
        echo "4100 not found!<br>";
    }

    $acc4101 = ChartOfAccount::updateOrCreate(
        ['account_code' => '4101'],
        [
            'account_name' => 'مبيعات',
            'account_type' => 'Revenue',
            'parent_id' => $acc4100 ? $acc4100->id : null,
            'is_active' => true
        ]
    );
    echo "Created/Updated 4101 (مبيعات)<br>";
    
    // Also fix any other headers that might be picked
    $acc5100 = ChartOfAccount::where('account_code', '5100')->first();
    if ($acc5100) {
        $acc5100->update(['account_name' => 'مجموعة تكلفة البضاعة المباعة']);
    }
    
    ChartOfAccount::updateOrCreate(
        ['account_code' => '5101'],
        [
            'account_name' => 'تكلفة البضاعة المباعة',
            'account_type' => 'Expense',
            'parent_id' => $acc5100 ? $acc5100->id : null,
            'is_active' => true
        ]
    );
    echo "Finished fixing accounts.";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
