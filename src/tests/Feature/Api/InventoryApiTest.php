<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    // Categories
    public function test_can_list_categories()
    {
        Category::factory()->count(3)->create();

        $response = $this->authGet(route('api.categories.index'));

        $this->assertSuccessResponse($response);
        $this->assertEquals(3, $response->json('meta.total'));
    }

    public function test_can_create_category()
    {
        $response = $this->authPost(route('api.categories.store'), [
            'name' => 'Electronics',
            'description' => 'Gadgets',
            'type' => 'product'
        ]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('categories', ['name' => 'Electronics']);
    }

    // Periodic Inventory
    public function test_can_view_periodic_inventory_valuation()
    {
        // This endpoint likely calculates valuation based on products and FIFO/Weighted Average
        // Route assumption
        $response = $this->authGet(route('api.inventory.periodic.valuation'));

        $this->assertSuccessResponse($response);
        // Expect a valuation structure
        $response->assertJsonStructure(['success', 'total_value']);
    }
}
