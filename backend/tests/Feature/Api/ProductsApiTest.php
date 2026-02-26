<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Authenticate as admin to bypass permission checks
        $this->authenticateUser();
    }

    public function test_can_list_products()
    {
        Product::factory()->count(5)->create();

        $response = $this->authGet(route('api.products.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'success',
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'description',
                    'unit_price',
                    'stock_quantity'
                ]
            ],
            'pagination' => [
                'current_page',
                'per_page',
                'total_records',
                'total_pages',
            ]
        ]);
        
        $this->assertEquals(5, $response->json('pagination.total_records'));
    }

    public function test_can_create_product()
    {
        $category = Category::factory()->create();

        $data = [
            'name' => 'New Product',
            'description' => 'Product Description',
            'category_id' => $category->id,
            'unit_price' => 50.00,
            'minimum_profit_margin' => 10,
            'stock_quantity' => 100,
            'unit_name' => 'pcs',
            'items_per_unit' => 1,
            'weighted_average_cost' => 40.00,
        ];

        $response = $this->authPost(route('api.products.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('products', ['name' => 'New Product']);
    }

    public function test_can_update_product()
    {
        $product = Product::factory()->create();

        $data = [
            'id' => $product->id,
            'name' => 'Updated Product Name',
            'description' => $product->description,
            'category_id' => $product->category_id,
            'unit_price' => 75.00, // Changed
            'minimum_profit_margin' => $product->minimum_profit_margin,
            'stock_quantity' => $product->stock_quantity,
            'unit_name' => $product->unit_name,
            'items_per_unit' => $product->items_per_unit,
            'weighted_average_cost' => $product->weighted_average_cost,
        ];

        $response = $this->authPut(route('api.products.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Product Name',
            'unit_price' => 75.00
        ]);
    }

    public function test_can_delete_product()
    {
        $product = Product::factory()->create();

        $response = $this->authDelete(route('api.products.destroy'), ['id' => $product->id]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }
}
