<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Product;
use App\Models\Invoice;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
    }

    public function test_dashboard_metrics()
    {
        // Seed Products
        Product::factory()->count(5)->create();
        Product::factory()->create(['stock_quantity' => 5]); // Low stock

        // Seed Financials (Sales)
        $sales = ChartOfAccount::where('account_code', '4100')->first();
        GeneralLedger::factory()->create([
            'account_id' => $sales->id,
            'entry_type' => 'CREDIT',
            'amount' => 1000
        ]);

        $response = $this->authGet(route('api.dashboard.index'));

        $this->assertSuccessResponse($response);
        $data = $response->json('data');
        
        $this->assertEquals(6, $data['total_products']);
        $this->assertEquals(1000, $data['total_sales']); // From GL
        $this->assertGreaterThanOrEqual(1, $data['low_stock_count']);
    }

    public function test_dashboard_details_low_stock()
    {
        Product::factory()->create(['name' => 'Low Item', 'stock_quantity' => 2]);

        $response = $this->authGet(route('api.dashboard.index', ['detail' => 'low_stock']));

        $this->assertSuccessResponse($response);
        $this->assertEquals('Low Item', $response->json('data.0.name'));
    }
}
