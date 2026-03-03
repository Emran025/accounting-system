<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\FiscalPeriod;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class FiscalPeriodsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
    }

    public function test_can_list_fiscal_periods()
    {
        FiscalPeriod::factory()->count(2)->create();

        $response = $this->authGet(route('api.fiscal_periods.index'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_can_create_fiscal_period()
    {
        $data = [
            'period_name' => 'FY2027',
            'start_date' => '2027-01-01',
            'end_date' => '2027-12-31',
        ];

        $response = $this->authPost(route('api.fiscal_periods.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('fiscal_periods', [
            'period_name' => 'FY2027',
        ]);
    }

    public function test_create_fiscal_period_validates_required_fields()
    {
        $response = $this->authPost(route('api.fiscal_periods.store'), []);

        $response->assertStatus(422);
    }

    public function test_can_close_fiscal_period()
    {
        $period = FiscalPeriod::factory()->create([
            'is_closed' => false,
            'is_locked' => false,
        ]);

        $response = $this->authPost(route('api.fiscal_periods.close'), [
            'id' => $period->id,
        ]);

        $this->assertSuccessResponse($response);
        $this->assertTrue($period->fresh()->is_closed);
    }

    public function test_can_lock_fiscal_period()
    {
        $period = FiscalPeriod::factory()->create([
            'is_closed' => true,
            'is_locked' => false,
        ]);

        $response = $this->authPost(route('api.fiscal_periods.lock'), [
            'id' => $period->id,
        ]);

        $this->assertSuccessResponse($response);
        $this->assertTrue($period->fresh()->is_locked);
    }

    public function test_can_unlock_fiscal_period()
    {
        $period = FiscalPeriod::factory()->create([
            'is_closed' => false,
            'is_locked' => true,
        ]);

        $response = $this->authPost(route('api.fiscal_periods.unlock'), [
            'id' => $period->id,
        ]);

        $this->assertSuccessResponse($response);
        $this->assertFalse($period->fresh()->is_locked);
    }
}
