<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReportsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
        $this->seedFinancialData();
    }

    protected function seedFinancialData()
    {
        // Seed Assets (Cash)
        $cash = ChartOfAccount::where('account_code', '1110')->first();
        GeneralLedger::factory()->createWithDates([
            'account_id' => $cash->id,
            'entry_type' => 'DEBIT',
            'amount' => 10000,
        ], now()->startOfMonth());

        // Seed Revenue
        $sales = ChartOfAccount::where('account_code', '4100')->first();
        GeneralLedger::factory()->createWithDates([
            'account_id' => $sales->id,
            'entry_type' => 'CREDIT',
            'amount' => 5000,
        ], now());

        // Seed Expense
        $cogs = ChartOfAccount::factory()->expense()->create(['account_code' => '5100', 'account_name' => 'COGS']);
        GeneralLedger::factory()->createWithDates([
            'account_id' => $cogs->id,
            'entry_type' => 'DEBIT',
            'amount' => 2000,
        ], now());
    }

    public function test_balance_sheet()
    {
        $response = $this->authGet(route('api.reports.balance_sheet'));

        $this->assertSuccessResponse($response);
        $data = $response->json('data');
        
        // Check Assets
        $this->assertEquals(10000, $data['assets']['total']);
        
        // Check Equity (Net Income should be 5000 - 2000 = 3000)
        // Note: Logic adds a virtual Net Income line to Equity
        $equity = $data['equity']['accounts'];
        $netIncomeLine = collect($equity)->firstWhere('account_code', 'NET_INCOME_VIRTUAL');
        $this->assertEquals(3000, $netIncomeLine['balance']);
    }

    public function test_profit_loss()
    {
        $response = $this->authGet(route('api.reports.profit_loss'));

        $this->assertSuccessResponse($response);
        $data = $response->json('data');
        
        $this->assertEquals(5000, $data['revenue']['total']);
        $this->assertEquals(2000, $data['expenses']['total']);
        $this->assertEquals(3000, $data['net_income']);
    }

    public function test_cash_flow()
    {
        $response = $this->authGet(route('api.reports.cash_flow'));

        $this->assertSuccessResponse($response);
        $data = $response->json('data');
        
        // Operating: Net Income (3000)
        // Investing: Change in Assets (excluding cash). We created COGS (Expense) and Sales (Revenue) and Cash (Asset)
        // Financing: Change in Liab/Equity.
        
        // Our seeded data: 
        // Cash Debit 10000. 
        // To balance (double entry), createWithDates doesn't enforce double entry automatically unless we do it.
        // But Report logic aggregates by account type.
        // Balance Sheet test passed implies Assets=10000.
        // Cash Flow Beginning = 0? (Start of month). 
        // End Cash = 10000.
        // Net Change should be 10000.
        
        $this->assertEquals(10000, $data['ending_cash']);
    }
}
