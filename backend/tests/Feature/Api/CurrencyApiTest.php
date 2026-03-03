<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Currency;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CurrencyApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_currencies()
    {
        Currency::factory()->count(2)->create();

        $response = $this->authGet(route('api.currencies.index'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_can_create_currency()
    {
        $data = [
            'code' => 'EUR',
            'name' => 'Euro',
            'symbol' => '€',
            'exchange_rate' => 1.08,
        ];

        $response = $this->authPost(route('api.currencies.store'), $data);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertDatabaseHas('currencies', ['code' => 'EUR', 'name' => 'Euro']);
    }

    public function test_create_currency_rejects_duplicate_code()
    {
        Currency::factory()->create(['code' => 'USD']);

        $data = [
            'code' => 'USD',
            'name' => 'Duplicate Dollar',
            'symbol' => '$',
            'exchange_rate' => 1.0,
        ];

        $response = $this->authPost(route('api.currencies.store'), $data);

        $response->assertStatus(422);
    }

    public function test_can_update_currency()
    {
        $currency = Currency::factory()->create(['code' => 'GBP']);

        $data = [
            'code' => 'GBP',
            'name' => 'British Pound Updated',
            'symbol' => '£',
            'exchange_rate' => 0.82,
        ];

        $response = $this->authPut(route('api.currencies.update', ['id' => $currency->id]), $data);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertDatabaseHas('currencies', ['id' => $currency->id, 'name' => 'British Pound Updated']);
    }

    public function test_can_delete_non_primary_currency()
    {
        $currency = Currency::factory()->create(['is_primary' => false]);

        $response = $this->authDelete(route('api.currencies.destroy', ['id' => $currency->id]));

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertSoftDeleted('currencies', ['id' => $currency->id]);
    }

    public function test_cannot_delete_primary_currency()
    {
        $currency = Currency::factory()->create(['is_primary' => true]);

        $response = $this->authDelete(route('api.currencies.destroy', ['id' => $currency->id]));

        $response->assertStatus(400)
            ->assertJson(['success' => false]);
        $this->assertDatabaseHas('currencies', ['id' => $currency->id]);
    }

    public function test_can_toggle_active_status()
    {
        $currency = Currency::factory()->create(['is_active' => true, 'is_primary' => false]);

        $response = $this->authPost(route('api.currencies.toggle', ['id' => $currency->id]));

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
        $this->assertFalse($currency->fresh()->is_active);
    }

    public function test_cannot_deactivate_primary_currency()
    {
        $currency = Currency::factory()->create(['is_primary' => true, 'is_active' => true]);

        $response = $this->authPost(route('api.currencies.toggle', ['id' => $currency->id]));

        $response->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    public function test_create_currency_validates_required_fields()
    {
        $response = $this->authPost(route('api.currencies.store'), []);

        $response->assertStatus(422);
    }
}
