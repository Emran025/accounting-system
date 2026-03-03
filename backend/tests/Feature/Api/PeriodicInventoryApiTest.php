<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Product;
use App\Models\InventoryCount;
use App\Models\FiscalPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class PeriodicInventoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();

        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);
    }

    public function test_can_list_inventory_counts()
    {
        $response = $this->authGet(route('api.inventory.periodic.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data', 'pagination']);
    }

    public function test_can_create_inventory_count()
    {
        $product = Product::factory()->create(['stock_quantity' => 50]);
        $period = FiscalPeriod::first();

        $data = [
            'product_id' => $product->id,
            'counted_quantity' => 48,
            'fiscal_period_id' => $period->id,
            'count_date' => now()->toDateString(),
            'notes' => 'Slight shortage found',
        ];

        $response = $this->authPost(route('api.inventory.periodic.store'), $data);

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'success',
            'data' => ['id', 'book_quantity', 'variance'],
        ]);

        // Variance should be counted - book = 48 - 50 = -2
        $this->assertEquals(-2, $response->json('data.variance'));
    }

    public function test_can_process_inventory_counts()
    {
        $product = Product::factory()->create([
            'stock_quantity' => 100,
            'weighted_average_cost' => 10.00,
        ]);
        $period = FiscalPeriod::first();

        // Seed costing layer
        app(\App\Services\InventoryCostingService::class)->recordPurchase($product->id, 1, 100, 10.00, 1000.00);

        // Create an unprocessed count with variance
        InventoryCount::create([
            'product_id' => $product->id,
            'fiscal_period_id' => $period->id,
            'count_date' => now(),
            'book_quantity' => 100,
            'counted_quantity' => 95,
            'variance' => -5,
            'is_processed' => false,
            'counted_by' => $this->authenticatedUser->id,
        ]);

        $response = $this->authPost(route('api.inventory.periodic.process'), [
            'fiscal_period_id' => $period->id,
        ]);

        $this->assertSuccessResponse($response);

        // Verify stock was adjusted
        $this->assertEquals(95, $product->fresh()->stock_quantity);
    }

    public function test_process_returns_error_when_no_counts()
    {
        $period = FiscalPeriod::first();

        $response = $this->authPost(route('api.inventory.periodic.process'), [
            'fiscal_period_id' => $period->id,
        ]);

        $this->assertErrorResponse($response, 400);
    }

    public function test_can_get_inventory_valuation()
    {
        Product::factory()->create([
            'stock_quantity' => 100,
            'weighted_average_cost' => 25.00,
        ]);

        $response = $this->authGet(route('api.inventory.periodic.valuation'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data' => ['total_value']]);
    }

    public function test_create_count_validates_required_fields()
    {
        $response = $this->authPost(route('api.inventory.periodic.store'), []);

        $response->assertStatus(422);
    }
}
