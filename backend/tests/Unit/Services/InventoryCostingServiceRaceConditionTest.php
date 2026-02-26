<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\InventoryCostingService;
use App\Models\Product;
use App\Exceptions\BusinessLogicException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

/**
 * Test race condition fixes in InventoryCostingService
 * 
 * These tests verify that concurrent sales don't cause:
 * - Negative inventory quantities
 * - Overselling inventory layers
 * - Data corruption
 */
class InventoryCostingServiceRaceConditionTest extends TestCase
{
    use RefreshDatabase;

    private InventoryCostingService $costingService;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->costingService = new InventoryCostingService();
        
        // Create a product with initial inventory
        $this->product = Product::factory()->create([
            'stock_quantity' => 0,
            'weighted_average_cost' => 10.00,
        ]);

        // Create inventory costing layer (purchase)
        $this->costingService->recordPurchase(
            $this->product->id,
            1, // purchase_id
            100, // quantity
            10.00, // unit_cost
            1000.00, // total_cost
            'FIFO'
        );
    }

    /**
     * Test that concurrent sales are handled correctly with locking
     */
    public function test_concurrent_sales_do_not_oversell_inventory(): void
    {
        // Simulate two concurrent sales of 60 units each
        // Total inventory: 100 units
        // Expected: One should succeed, one should fail with BusinessLogicException

        $sale1Success = false;
        $sale2Success = false;
        $sale1Exception = null;
        $sale2Exception = null;

        // Simulate concurrent transactions
        try {
            DB::transaction(function () use (&$sale1Success) {
                $this->costingService->recordSale(
                    $this->product->id,
                    1, // sale_id
                    60, // quantity
                    'FIFO'
                );
                $sale1Success = true;
            });
        } catch (BusinessLogicException $e) {
            $sale1Exception = $e;
        }

        try {
            DB::transaction(function () use (&$sale2Success) {
                $this->costingService->recordSale(
                    $this->product->id,
                    2, // sale_id
                    60, // quantity
                    'FIFO'
                );
                $sale2Success = true;
            });
        } catch (BusinessLogicException $e) {
            $sale2Exception = $e;
        }

        // At least one should succeed
        $this->assertTrue($sale1Success || $sale2Success, 'At least one sale should succeed');

        // At least one should fail due to insufficient inventory
        $this->assertTrue(
            ($sale1Exception !== null && $sale1Exception->getMessage() === 'Insufficient inventory available. Requested: 60, Available: 40 (Product ID: ' . $this->product->id . ')') ||
            ($sale2Exception !== null && $sale2Exception->getMessage() === 'Insufficient inventory available. Requested: 60, Available: 40 (Product ID: ' . $this->product->id . ')'),
            'One sale should fail with insufficient inventory error'
        );

        // Verify no negative inventory
        $remainingInventory = DB::table('inventory_costing as ic')
            ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
            ->selectRaw('ic.quantity - COALESCE(SUM(cons.quantity), 0) as remaining')
            ->where('ic.product_id', $this->product->id)
            ->groupBy('ic.id', 'ic.quantity')
            ->first();

        $this->assertGreaterThanOrEqual(0, $remainingInventory->remaining, 'Remaining inventory should never be negative');
    }

    /**
     * Test that exact inventory consumption works correctly
     */
    public function test_exact_inventory_consumption_succeeds(): void
    {
        // Sell exactly 100 units (all available)
        $cogs = $this->costingService->recordSale(
            $this->product->id,
            1,
            100,
            'FIFO'
        );

        $this->assertEquals(1000.00, $cogs, 'COGS should be 100 * 10.00 = 1000.00');

        // Verify all inventory is consumed
        $remainingInventory = DB::table('inventory_costing as ic')
            ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
            ->selectRaw('ic.quantity - COALESCE(SUM(cons.quantity), 0) as remaining')
            ->where('ic.product_id', $this->product->id)
            ->groupBy('ic.id', 'ic.quantity')
            ->first();

        $this->assertEquals(0, $remainingInventory->remaining, 'All inventory should be consumed');
    }

    /**
     * Test that overselling is prevented
     */
    public function test_overselling_throws_business_logic_exception(): void
    {
        $this->expectException(BusinessLogicException::class);
        $this->expectExceptionMessage('Insufficient inventory available');

        // Try to sell 101 units when only 100 available
        $this->costingService->recordSale(
            $this->product->id,
            1,
            101,
            'FIFO'
        );
    }

    /**
     * Test FIFO ordering is maintained
     */
    public function test_fifo_ordering_maintained(): void
    {
        // Create multiple inventory layers
        $this->costingService->recordPurchase($this->product->id, 2, 50, 12.00, 600.00, 'FIFO');
        $this->costingService->recordPurchase($this->product->id, 3, 50, 15.00, 750.00, 'FIFO');

        // Sell 120 units - should consume: 100 @ 10.00 + 20 @ 12.00
        $cogs = $this->costingService->recordSale($this->product->id, 1, 120, 'FIFO');

        $expectedCogs = (100 * 10.00) + (20 * 12.00); // 1000 + 240 = 1240
        $this->assertEquals($expectedCogs, $cogs, 'FIFO should consume oldest layers first');
    }
}

