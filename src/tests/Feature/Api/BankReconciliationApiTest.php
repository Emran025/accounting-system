<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Reconciliation;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\FiscalPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BankReconciliationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
        $this->seedSpecificAccounts();
    }

    protected function seedSpecificAccounts()
    {
        // Seeding accounts hardcoded in Controller
        // 1110 is seeded by seedChartOfAccounts (Cash)
        // 5101 (Expense offset?) - create if not exists
        if (!ChartOfAccount::where('account_code', '5101')->exists()) {
            ChartOfAccount::factory()->expense()->create([
                'account_code' => '5101',
                'account_name' => 'Bank Charges'
            ]);
        }
        // 5290 (Suspense/Diff)
        if (!ChartOfAccount::where('account_code', '5290')->exists()) {
            ChartOfAccount::factory()->expense()->create([
                'account_code' => '5290',
                'account_name' => 'Reconciliation Differences'
            ]);
        }
    }

    public function test_can_list_reconciliations()
    {
        Reconciliation::factory()->count(2)->create();

        $response = $this->authGet(route('api.reconciliation.index')); // Route likely named this way based on controller

        // Adjust route name if needed. Typically api.reconciliation.index
        $this->assertSuccessResponse($response);
        $this->assertEquals(2, $response->json('total'));
    }

    public function test_can_calculate_ledger_balance()
    {
        $cash = ChartOfAccount::where('account_code', '1110')->first();
        if (!$cash) {
            $cash = ChartOfAccount::factory()->create(['account_code' => '1110', 'account_name' => 'Cash', 'account_type' => 'Asset']);
        }
        
        // Use factory to ensure consistent data creation
        // Set voucher_date to yesterday to avoid potential string comparison issues with "today" inclusive filters
        GeneralLedger::factory()->create([
            'account_id' => $cash->id,
            'entry_type' => 'DEBIT',
            'amount' => 5000,
            'voucher_date' => now()->subDay()->toDateString(),
            'is_closed' => false,
        ]);
        
        // Pass explicit date to ensure controller uses same date context as test
        $response = $this->authGet(route('api.reconciliation.index', ['action' => 'calculate', 'date' => now()->toDateString()]));

        $this->assertSuccessResponse($response);
        
        // Use loose assertion for float comparison safety, though exact 5000 is expected
        $this->assertEquals(5000, $response->json("ledger_balance"));
    }

    public function test_can_create_reconciliation()
    {
        // Setup initial balance
        $cash = ChartOfAccount::where('account_code', '1110')->first();
        GeneralLedger::factory()->create([
            'account_id' => $cash->id,
            'entry_type' => 'DEBIT',
            'amount' => 1000,
            'voucher_date' => now()->subDay()->toDateString() // Yesterday
        ]);

        $data = [
            'reconciliation_date' => now()->toDateString(), // Today
            'physical_balance' => 1200, // 200 difference
            'notes' => 'Month End'
        ];

        $response = $this->authPost(route('api.reconciliation.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('reconciliations', [
            'physical_balance' => 1200,
            'ledger_balance' => 1000,
            'difference' => 200
        ]);
    }

    public function test_can_post_adjustment()
    {
        $reconciliation = Reconciliation::factory()->create([
            'physical_balance' => 900,
            'ledger_balance' => 1000,
            'difference' => -100, // Ledger is higher, maybe forgot to record an expense
        ]);

        // Seed initial GL balance to match reconciliation
        $cash = ChartOfAccount::where('account_code', '1110')->first();
        GeneralLedger::factory()->create([
            'account_id' => $cash->id,
            'entry_type' => 'DEBIT',
            'amount' => 1000,
            'voucher_date' => now()->toDateString()
        ]);

        // Adjustment: Add expense (Bank Charges)
        // Controller logic for DEBIT: Target=1110 (Cash?), Offset=5101 (Charges?)
        // Wait, Controller: Target=1110 if Debit -> Debit Cash? 
        // If entry_type=DEBIT -> Target=1110, Offset=5101. GL post: Target:DEBIT (Cash Debit), Offset:CREDIT (Exp Credit?).
        // Usually Bank Charges = Debit Expense, Credit Cash.
        // If I send CREDIT adjustment: Target=5290 (Diff), Offset=1110 (Cash). 
        // Let's rely on controller logic: "entry_type" -> required IN DEBIT, CREDIT.
        
        $data = [
            'reconciliation_id' => $reconciliation->id,
            'amount' => 100,
            'entry_type' => 'CREDIT', // Credit Cash
            'description' => 'Bank Fee'
        ];

        // Route: PUT /api/reconciliation?action=adjust
        // Wait, route parameters or query? Controller says $request->query('action')
        $response = $this->authPut(route('api.reconciliation.update', ['action' => 'adjust']), $data);

        $this->assertSuccessResponse($response);
        
        // Verify GL posted
        $this->assertDatabaseHas('general_ledger', ['description' => 'Bank Fee', 'entry_type' => 'CREDIT']);
        
        // Verify reconciliation updated (recalculated)
        // Previous Ledger: 1000. New Transaction: Credit 100 -> Balance 900.
        // Difference: 900 (Bank) - 900 (Ledger) = 0.
        $reconciliation->refresh();
        $this->assertEquals(0, $reconciliation->difference);
    }
}
