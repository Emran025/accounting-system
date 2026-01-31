<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Purchase;
use App\Models\Product;
use App\Models\ApSupplier;
use Illuminate\Support\Facades\Config;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PurchasesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_purchases_returns_list()
    {
        $this->authenticateUser();
        
        Purchase::factory()->count(3)->create([
            'user_id' => $this->authenticatedUser->id
        ]);

        $response = $this->authGet(route('api.purchases.index'));
        
        $this->assertSuccessResponse($response);
        $response->assertJsonCount(3, 'purchases.data');
    }

    public function test_create_purchase_api()
    {
        $this->authenticateUser();
        $product = Product::factory()->create();
        $supplier = ApSupplier::factory()->create();

        $data = [
            'product_id' => $product->id,
            'quantity' => 10,
            'invoice_price' => 1000,
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 15,
            'notes' => 'API Test Purchase'
        ];

        Config::set('accounting.vat_rate', 0.15);

        $response = $this->authPost(route('api.purchases.store'), $data);

        $this->assertSuccessResponse($response, 201);
        $this->assertDatabaseHas('purchases', [
            'product_id' => $product->id,
            'invoice_price' => 1000
        ]);
    }

    public function test_approve_purchase_api()
    {
        $this->authenticateUser();
        $purchase = Purchase::factory()->create([
            'approval_status' => 'pending'
        ]);

        $response = $this->authPost(route('api.purchases.approve'), [
             'purchase_id' => $purchase->id
        ]);

        $this->assertSuccessResponse($response);
        $this->assertEquals('approved', $purchase->fresh()->approval_status);
    }

    public function test_reverse_purchase_api() // Mapped to destroy in routes?
    {
        // Route::delete('/purchases', [PurchasesController::class, 'destroy']) 
        // Note: Controller probably expects an ID in the body or query? 
        // Valid REST would be DELETE /purchases/{id}, but route is /purchases.
        // Let's assume it takes 'id' in body based on standard practice in this repo (inferred).
        // Let's check route definition again: Route::delete('/purchases', ... -> destroy)
        
        $this->authenticateUser();
        $purchase = Purchase::factory()->create(['approval_status' => 'approved']);

        $response = $this->authDelete(route('api.purchases.destroy'), [
            'id' => $purchase->id
        ]);

        $this->assertSuccessResponse($response);
        $this->assertTrue($purchase->fresh()->is_reversed);
    }
}
