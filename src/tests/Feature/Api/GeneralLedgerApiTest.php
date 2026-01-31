<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;

class GeneralLedgerApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
    }

    public function test_can_view_trial_balance()
    {
        // Seed some data implicitly via transactions or manually
        $account = ChartOfAccount::where('account_code', '1110')->first(); // Cash
        GeneralLedger::factory()->create([
            'account_id' => $account->id,
            'entry_type' => 'DEBIT',
            'amount' => 1000
        ]);

        $response = $this->authGet(route('api.gl.trial_balance'));

        $this->assertSuccessResponse($response);
        // We expect at least one item with non-zero balance
        // The structure is {success, items: [...]}
        $items = $response->json('items');
        $this->assertNotEmpty($items);
        
        // Find our cash account
        $cashItem = collect($items)->firstWhere('account_code', '1110');
        $this->assertEquals(1000, $cashItem['debit']);
    }

    public function test_can_view_account_details()
    {
        $account = ChartOfAccount::where('account_code', '1110')->first();
        GeneralLedger::factory()->create([
            'account_id' => $account->id, // Asset
            'entry_type' => 'DEBIT',
            'amount' => 500,
            'description' => 'Test Deposit'
        ]);

        $response = $this->authGet(route('api.gl.account_details', ['account_code' => '1110']));

        $this->assertSuccessResponse($response);
        $this->assertEquals(500, $response->json('account.current_balance'));
        $this->assertEquals('Test Deposit', $response->json('transactions.0.description'));
    }

    public function test_can_filter_gl_entries()
    {
        $account = ChartOfAccount::where('account_code', '1110')->first();
        GeneralLedger::factory()->create([
            'account_id' => $account->id,
            'voucher_number' => 'V-100'
        ]);
        GeneralLedger::factory()->create([
            'account_id' => $account->id,
            'voucher_number' => 'V-200'
        ]);

        $response = $this->authGet(route('api.gl.entries', ['voucher_number' => 'V-100']));

        $this->assertSuccessResponse($response);
        $this->assertEquals(1, $response->json('total'));
        $this->assertEquals('V-100', $response->json('entries.0.entry_number'));
    }

    public function test_account_activity_summary()
    {
        $account = ChartOfAccount::where('account_code', '1110')->first();
        GeneralLedger::factory()->createWithDates([
            'account_id' => $account->id,
            'entry_type' => 'DEBIT',
            'amount' => 100
        ], now()->subDays(1)); // Make sure it's within default date range if needed, or we specify range

        $response = $this->authGet(route('api.gl.account_activity', [
            'start_date' => now()->subDays(5)->format('Y-m-d'),
            'end_date' => now()->addDays(1)->format('Y-m-d')
        ]));

        $this->assertSuccessResponse($response);
        $data = $response->json('data');
        $cashActivity = collect($data)->firstWhere('account_code', '1110');
        $this->assertEquals(100, $cashActivity['debits']);
    }

    public function test_account_balance_history()
    {
         $account = ChartOfAccount::where('account_code', '1110')->first();
         
         // Create entries in different months
         GeneralLedger::factory()->createWithDates([
             'account_id' => $account->id,
             'entry_type' => 'DEBIT',
             'amount' => 100,
         ], now()->subMonth()->startOfMonth());

         GeneralLedger::factory()->createWithDates([
             'account_id' => $account->id,
             'entry_type' => 'DEBIT',
             'amount' => 200,
         ], now()->startOfMonth());

         $response = $this->authGet(route('api.gl.balance_history', [
             'account_code' => '1110',
             'interval' => 'month',
             'start_date' => now()->subMonths(2)->format('Y-m-d'),
             'end_date' => now()->format('Y-m-d')
         ]));

         $this->assertSuccessResponse($response);
         $history = $response->json('history');
         $this->assertCount(2, $history); // 2 months with data, or depending on implementation might fill gaps?
         // Our implementation groups existing entries, so it won't fill gaps probably unless we check implementation.
         // Logic: $entries->groupBy... foreach $grouped. So only periods with data.
    }
}
