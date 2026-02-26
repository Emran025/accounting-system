<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\SalesRepresentative;
use App\Models\SalesRepresentativeTransaction;
use App\Models\Invoice;
use App\Models\FiscalPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class SalesRepresentativeApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();

        // Create fiscal period for current date
        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);
    }

    public function test_can_list_representatives()
    {
        SalesRepresentative::factory()->count(3)->create();

        $response = $this->authGet(route('api.sales_representatives.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'success',
            'data',
            'pagination'
        ]);
        
        $this->assertEquals(3, $response->json('pagination.total_records'));
    }

    public function test_can_create_representative()
    {
        $data = [
            'name' => 'John Doe Rep',
            'phone' => '1234567890',
            'email' => 'john@rep.test',
            'address' => '123 Main St'
        ];

        $response = $this->authPost(route('api.sales_representatives.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('sales_representatives', [
            'name' => 'John Doe Rep',
            'email' => 'john@rep.test'
        ]);
    }

    public function test_can_update_representative()
    {
        $rep = SalesRepresentative::factory()->create(['name' => 'Old Name']);

        $data = [
            'id' => $rep->id,
            'name' => 'New Name rep',
        ];

        $response = $this->authPut(route('api.sales_representatives.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('sales_representatives', [
            'id' => $rep->id,
            'name' => 'New Name rep'
        ]);
    }

    public function test_can_delete_representative()
    {
        $rep = SalesRepresentative::factory()->create();

        $response = $this->authDelete(route('api.sales_representatives.destroy'), ['id' => $rep->id]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('sales_representatives', ['id' => $rep->id]);
    }

    public function test_can_get_representative_ledger()
    {
        $rep = SalesRepresentative::factory()->create();
        SalesRepresentativeTransaction::factory()->count(2)->create([
            'sales_representative_id' => $rep->id,
            'type' => 'commission',
            'amount' => 100
        ]);

        $response = $this->authGet(route('api.sales_representatives.ledger', ['sales_representative_id' => $rep->id]));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'success',
            'data',
            'stats',
            'pagination',
            'representative'
        ]);
        $this->assertEquals(2, $response->json('pagination.total_records'));
    }

    public function test_can_create_representative_transaction()
    {
        $rep = SalesRepresentative::factory()->create(['current_balance' => 0]);

        $data = [
            'sales_representative_id' => $rep->id,
            'type' => 'payment',
            'amount' => 100, // Must be positive, the controller subtracts it internally
            'date' => now()->toDateString(),
            'description' => 'Test Payment'
        ];

        $response = $this->authPost(route('api.sales_representatives.transactions.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('sales_representative_transactions', [
            'sales_representative_id' => $rep->id,
            'type' => 'payment',
            'amount' => 100
        ]);
    }

    public function test_can_delete_representative_transaction()
    {
        $rep = SalesRepresentative::factory()->create();
        $transaction = SalesRepresentativeTransaction::factory()->create([
            'sales_representative_id' => $rep->id,
            'type' => 'payment',
            'amount' => 100
        ]);

        $response = $this->authDelete(route('api.sales_representatives.transactions.destroy'), ['id' => $transaction->id]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('sales_representative_transactions', [
            'id' => $transaction->id,
            'is_deleted' => true
        ]);
    }
}
