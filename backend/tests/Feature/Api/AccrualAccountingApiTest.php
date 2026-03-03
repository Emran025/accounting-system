<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Prepayment;
use App\Models\UnearnedRevenue;
use App\Models\FiscalPeriod;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class AccrualAccountingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();

        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1140',
            'account_name' => 'Prepaid Expenses'
        ]);
        
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2140',
            'account_name' => 'Unearned Revenue'
        ]);

        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);
    }

    public function test_can_list_accrual_entries()
    {
        $response = $this->authGet(route('api.accrual.index', ['module' => 'prepayments']));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data']);
    }

    public function test_can_create_prepayment()
    {
        $data = [
            'type' => 'prepayment',
            'description' => 'Insurance Prepayment',
            'total_amount' => 12000.00,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'periods' => 12,
            'payment_type' => 'cash',
            'account_code' => '5100',
        ];

        $response = $this->authPost(route('api.accrual.store'), $data);

        $this->assertSuccessResponse($response);
    }

    public function test_can_create_unearned_revenue()
    {
        $data = [
            'type' => 'unearned_revenue',
            'description' => 'Annual Subscription Received',
            'total_amount' => 6000.00,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'periods' => 6,
            'payment_type' => 'cash',
        ];

        $response = $this->authPost(route('api.accrual.store'), $data);

        $this->assertSuccessResponse($response);
    }

    public function test_create_accrual_validates_required_fields()
    {
        $response = $this->authPost(route('api.accrual.store'), ['type' => 'prepayment']);

        $response->assertStatus(422);
    }

    public function test_can_amortize_prepayment()
    {
        // Create a prepayment entry first
        $prepayment = Prepayment::create([
            'description' => 'Test Prepayment',
            'total_amount' => 1200,
            'payment_date' => now()->subMonth(),
            'amortization_periods' => 12,
            'expense_account_code' => '5100',
            'created_by' => $this->authenticatedUser->id,
        ]);
        
        $prepayment->amortized_amount = 0;
        $prepayment->save();

        $data = [
            'type' => 'prepayment',
            'id' => $prepayment->id,
            'action' => 'amortize',
        ];

        $response = $this->authPut(route('api.accrual.update'), $data);

        $this->assertSuccessResponse($response);
    }
}
