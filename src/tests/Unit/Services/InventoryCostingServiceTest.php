<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Product;
use App\Services\InventoryCostingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class InventoryCostingServiceTest extends TestCase
{
    use RefreshDatabase;

    private InventoryCostingService $costingService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->costingService = new InventoryCostingService();
    }

    public function test_record_purchase_fifo()
    {
        $product = Product::factory()->create();
        
        $this->costingService->recordPurchase(
            $product->id,
            1, // Purchase ID
            10, // Qty
            100.00, // Unit Cost
            1000.00,
            'FIFO'
        );

        $this->assertDatabaseHas('inventory_costing', [
            'product_id' => $product->id,
            'quantity' => 10,
            'remaining_quantity' => 10, // Assuming db trigger or logic holds, but wait, schema says consumed_quantity defaults 0
            'consumed_quantity' => 0,
            'unit_cost' => 100.00
        ]);
    }

    public function test_record_sale_fifo_consumption()
    {
        $product = Product::factory()->create();

        // Layer 1: 10 @ 100
        $this->costingService->recordPurchase($product->id, 1, 10, 100.00, 1000.00, 'FIFO');
        // Layer 2: 10 @ 120
        $this->costingService->recordPurchase($product->id, 2, 10, 120.00, 1200.00, 'FIFO');

        // Sell 15
        // Should take 10 from Layer 1 (@100) and 5 from Layer 2 (@120)
        // COGS = (10*100) + (5*120) = 1000 + 600 = 1600
        
        $cogs = $this->costingService->recordSale($product->id, 100, 15, 'FIFO');

        $this->assertEquals(1600.00, $cogs);

        // Verify consumption records
        $this->assertDatabaseHas('inventory_consumptions', [
             'unit_cost' => 100.00,
             'quantity' => 10
        ]);
        $this->assertDatabaseHas('inventory_consumptions', [
             'unit_cost' => 120.00,
             'quantity' => 5
        ]);
    }

    public function test_valuation_fifo()
    {
        $product = Product::factory()->create();

        // Layer 1: 10 @ 100 (Sold 5 later)
        $this->costingService->recordPurchase($product->id, 1, 10, 100.00, 1000.00, 'FIFO');
        
        // Sell 5
        $this->costingService->recordSale($product->id, 100, 5, 'FIFO');

        // Remaining: 5 @ 100 = 500
        $valuation = $this->costingService->getInventoryValuation($product->id, 'FIFO');

        $this->assertCount(1, $valuation);
        $this->assertEquals(5, $valuation[0]['quantity']);
        $this->assertEquals(500.00, $valuation[0]['value']);
    }

    public function test_update_weighted_average_cost()
    {
        $product = Product::factory()->create(['weighted_average_cost' => 0]);

        // 10 @ 100 = 1000
        $this->costingService->recordPurchase($product->id, 1, 10, 100.00, 1000.00);
        
        // 10 @ 200 = 2000
        // Total: 20 Items, Value 3000 -> Avg 150
        $this->costingService->recordPurchase($product->id, 2, 10, 200.00, 2000.00);

        $wac = $this->costingService->updateWeightedAverageCost($product->id);

        $this->assertEquals(150.00, $wac);
        $this->assertEquals(150.00, $product->fresh()->weighted_average_cost);
    }
}
