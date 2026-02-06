<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Asset;
use App\Services\DepreciationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DepreciationServiceTest extends TestCase
{
    use RefreshDatabase;

    private DepreciationService $depreciationService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedChartOfAccounts();
        
        // Seed Depreciation specific accounts
        \App\Models\ChartOfAccount::factory()->create([
            'account_code' => '5300',
            'account_name' => 'Depreciation Expense',
            'account_type' => 'Expense'
        ]);
        \App\Models\ChartOfAccount::factory()->create([
            'account_code' => '1290',
            'account_name' => 'Accumulated Depreciation',
            'account_type' => 'Asset' // Contra-asset usually, but Asset type in system
        ]);

        $this->depreciationService = app(DepreciationService::class);
    }

    public function test_calculate_straight_line_depreciation()
    {
        $asset = Asset::factory()->create([
            'purchase_value' => 12000,
            'salvage_value' => 0,
            'useful_life_years' => 1, // 12000 per year = 1000 per month
            'purchase_date' => now()->subMonths(6)->format('Y-m-d'), // 6 months old
        ]);

        $amount = $this->depreciationService->calculateDepreciation(
            $asset->id,
            'straight_line',
            now()->format('Y-m-d')
        );

        // 1000 * 6 = 6000
        // Rounding issues depending on day difference, let's use approx
        // The service uses Y-m-d diff.
        // new DateTime('now()->subMonths(6)') vs new DateTime('now') should be exactly 6 months if days match.
        // Actually, logic: ($interval->y * 12) + $interval->m;
        // This ignores days, so it's month-based.
        
        $this->assertEquals(6000.00, $amount);
    }

    public function test_calculate_declining_balance()
    {
        $asset = Asset::factory()->create([
            'purchase_value' => 10000,
            'accumulated_depreciation' => 0,
            'depreciation_rate' => 20, // 20%
            'purchase_date' => now()->subYear()->format('Y-m-d'), // 1 year old
        ]);

        // Book Value = 10000. Annual Dep = 2000.
        // Months elapsed = 12.
        // Monthly = 2000/12. Amount = Monthly * 12 = 2000.

        $amount = $this->depreciationService->calculateDepreciation(
            $asset->id,
            'declining_balance',
            now()->format('Y-m-d')
        );

        $this->assertEquals(2000.00, $amount);
    }

    public function test_post_depreciation_entry()
    {
        $asset = Asset::factory()->create([
            'name' => 'Laptop',
            'accumulated_depreciation' => 0
        ]);
        
        $voucher = $this->depreciationService->postDepreciationEntry($asset->id, 500.00, now()->format('Y-m-d'));

        $this->assertNotEmpty($voucher);
        $this->assertEquals(500.00, $asset->fresh()->accumulated_depreciation);
        
        $this->assertDatabaseHas('general_ledger', [
            'reference_type' => 'assets',
            'reference_id' => $asset->id,
            'amount' => 500.00
        ]);
    }

    public function test_get_depreciation_schedule()
    {
        $asset = Asset::factory()->create([
            'purchase_value' => 5000,
            'useful_life_years' => 5,
            'salvage_value' => 0
        ]);

        $schedule = $this->depreciationService->getDepreciationSchedule($asset->id);

        $this->assertCount(5, $schedule);
        $this->assertEquals(1000, $schedule[0]['depreciation']);
        $this->assertEquals(1000, $schedule[0]['accumulated_depreciation']);
        $this->assertEquals(4000, $schedule[0]['book_value']);
        
        $this->assertEquals(1000, $schedule[4]['depreciation']);
        $this->assertEquals(5000, $schedule[4]['accumulated_depreciation']);
        $this->assertEquals(0, $schedule[4]['book_value']);
    }
}
