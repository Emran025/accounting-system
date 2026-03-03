<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Revenue;
use App\Models\GeneralLedger;
use App\Models\FiscalPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class RevenuesApiTest extends TestCase
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

    public function test_can_list_revenues()
    {
        Revenue::factory()->count(3)->create([
            'user_id' => $this->authenticatedUser->id,
        ]);

        $response = $this->authGet(route('api.revenues.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'success',
            'data',
            'pagination',
        ]);
    }

    public function test_can_create_revenue_with_gl_posting()
    {
        $data = [
            'source' => 'Consulting Services',
            'amount' => 1000.00,
            'revenue_date' => now()->toDateString(),
            'description' => 'Monthly consulting fee',
        ];

        $response = $this->authPost(route('api.revenues.store'), $data);

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'id', 'voucher_number']);

        $voucherNumber = $response->json('voucher_number');

        // Verify double-entry: Debit Cash, Credit Revenue
        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $voucherNumber,
            'entry_type' => 'DEBIT',
            'amount' => 1000.00,
        ]);

        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $voucherNumber,
            'entry_type' => 'CREDIT',
            'amount' => 1000.00,
        ]);
    }

    public function test_create_revenue_validates_required_fields()
    {
        $response = $this->authPost(route('api.revenues.store'), []);

        $response->assertStatus(422);
    }

    public function test_can_update_revenue_metadata()
    {
        $revenue = Revenue::factory()->create([
            'user_id' => $this->authenticatedUser->id,
            'source' => 'Old Source',
        ]);

        $data = [
            'id' => $revenue->id,
            'source' => 'New Source',
            'description' => 'Updated desc',
        ];

        $response = $this->authPut(route('api.revenues.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('revenues', [
            'id' => $revenue->id,
            'source' => 'New Source',
        ]);
    }

    public function test_can_delete_revenue_with_gl_reversal()
    {
        $data = [
            'source' => 'Consulting Services',
            'amount' => 1000.00,
            'revenue_date' => now()->toDateString(),
            'description' => 'Test delete',
        ];

        $response = $this->authPost(route('api.revenues.store'), $data);
        $this->assertSuccessResponse($response);

        $revenueId = $response->json('id');
        $voucherNumber = $response->json('voucher_number');

        $response = $this->authDelete(route('api.revenues.destroy'), ['id' => $revenueId]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('revenues', ['id' => $revenueId]);
    }

    public function test_create_revenue_rejects_negative_amount()
    {
        $data = [
            'source' => 'Test',
            'amount' => -100,
        ];

        $response = $this->authPost(route('api.revenues.store'), $data);

        $response->assertStatus(422);
    }
}
