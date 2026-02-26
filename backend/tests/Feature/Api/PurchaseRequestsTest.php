<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Product;
use App\Models\PurchaseRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PurchaseRequestsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed standard accounts for GL which might be used during some operations
        $this->seedChartOfAccounts();
    }

    public function test_auto_generate_purchase_requests()
    {
        $this->authenticateUser();

        // Create products below and above threshold
        $product1 = Product::factory()->create([
            'name' => 'Low Stock Product',
            'stock_quantity' => 5,
            'low_stock_threshold' => 10,
        ]);

        $product2 = Product::factory()->create([
            'name' => 'High Stock Product',
            'stock_quantity' => 20,
            'low_stock_threshold' => 10,
        ]);

        $product3 = Product::factory()->create([
            'name' => 'At Threshold Product',
            'stock_quantity' => 10,
            'low_stock_threshold' => 10,
        ]);

        // Trigger auto-generation
        $response = $this->authPost(route('api.requests.auto_generate'));

        $this->assertSuccessResponse($response);
        $response->assertJson([
            'generated_count' => 2
        ]);

        // Verify requests created for product 1 and 3
        $this->assertDatabaseHas('purchase_requests', [
            'product_id' => $product1->id,
            'status' => 'pending',
            'quantity' => 20, // max(10, 10 * 2)
        ]);

        $this->assertDatabaseHas('purchase_requests', [
            'product_id' => $product3->id,
            'status' => 'pending',
            'quantity' => 20, // max(10, 10 * 2)
        ]);

        // Verify no request for product 2
        $this->assertDatabaseMissing('purchase_requests', [
            'product_id' => $product2->id,
        ]);
    }

    public function test_auto_generate_avoids_duplicates()
    {
        $this->authenticateUser();

        $product = Product::factory()->create([
            'stock_quantity' => 5,
            'low_stock_threshold' => 10,
        ]);

        // Manually create a pending request
        PurchaseRequest::create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 15,
            'user_id' => $this->authenticatedUser->id,
            'status' => 'pending',
        ]);

        // Trigger auto-generation
        $response = $this->authPost(route('api.requests.auto_generate'));

        $this->assertSuccessResponse($response);
        $response->assertJson([
            'generated_count' => 0
        ]);

        // Verify only one request exists
        $this->assertEquals(1, PurchaseRequest::where('product_id', $product->id)->count());
    }

    public function test_get_requests_list()
    {
        $this->authenticateUser();

        PurchaseRequest::create([
            'product_name' => 'Manual Request',
            'quantity' => 10,
            'user_id' => $this->authenticatedUser->id,
            'status' => 'pending',
        ]);

        $response = $this->authGet(route('api.requests.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonPath('data.0.product_name', 'Manual Request');
    }

    public function test_store_manual_request()
    {
        $this->authenticateUser();

        $product = Product::factory()->create();

        $data = [
            'product_id' => $product->id,
            'quantity' => 50,
            'notes' => 'Urgent',
        ];

        $response = $this->authPost(route('api.requests.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('purchase_requests', [
            'product_id' => $product->id,
            'quantity' => 50,
            'notes' => 'Urgent',
        ]);
    }
}
