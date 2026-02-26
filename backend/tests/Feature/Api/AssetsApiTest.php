<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Asset;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AssetsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_crud_assets()
    {
        // Create
        $response = $this->authPost(route('api.assets.store'), [
            'name' => 'Laptop',
            'purchase_value' => 1500,
            'purchase_date' => now()->toDateString(),
            'status' => 'active'
        ]);
        $this->assertSuccessResponse($response);
        $assetId = $response->json('id');

        // List
        $this->authGet(route('api.assets.index'))->assertJsonCount(1, 'data');

        // Update
        $this->authPut(route('api.assets.update'), [
            'id' => $assetId,
            'name' => 'Laptop Pro',
            'purchase_value' => 1500,
            'purchase_date' => now()->toDateString(),
        ])->assertStatus(200);

        // Delete
        $this->authDelete(route('api.assets.destroy'), ['id' => $assetId])
            ->assertStatus(200);
            
        $this->assertDatabaseMissing('assets', ['id' => $assetId]);
    }
}
