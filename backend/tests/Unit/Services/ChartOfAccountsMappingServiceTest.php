<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\ChartOfAccount;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ChartOfAccountsMappingServiceTest extends TestCase
{
    use RefreshDatabase;

    private ChartOfAccountsMappingService $mappingService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mappingService = new ChartOfAccountsMappingService();
    }

    public function test_get_standard_accounts_returns_defaults()
    {
        // No accounts exist, should return defaults like '1110', etc.
        $mappings = $this->mappingService->getStandardAccounts();
        
        $this->assertEquals('1110', $mappings['cash']);
        $this->assertEquals('2110', $mappings['accounts_payable']);
    }

    public function test_get_account_code_finds_account_by_name()
    {
        ChartOfAccount::factory()->create([
            'account_type' => 'Asset',
            'account_name' => 'Custom Cash',
            'account_code' => '1111'
        ]);

        $code = $this->mappingService->getAccountCode('Asset', 'Custom Cash');
        
        $this->assertEquals('1111', $code);
    }

    public function test_get_account_code_ignores_parent_accounts()
    {
        // Parent Account (Has children)
        $parent = ChartOfAccount::factory()->create([
            'account_type' => 'Asset',
            'account_name' => 'Parent Asset',
            'account_code' => '1000'
        ]);

        // Child Account
        $child = ChartOfAccount::factory()->create([
            'account_type' => 'Asset',
            'account_name' => 'Child Asset',
            'account_code' => '1001',
            'parent_id' => $parent->id
        ]);

        // Search for 'Parent Asset' should technically fail if we enforce leaf-only logic 
        // OR return the child if logic is "leaf node related to X"? 
        // The code says: `where('account_name', ...)` AND `whereNotExists (children)`
        // So searching for "Parent Asset" should return NULL because it has children.
        
        $code = $this->mappingService->getAccountCode('Asset', 'Parent Asset');
        $this->assertNull($code);

        // Child should be found
        $code = $this->mappingService->getAccountCode('Asset', 'Child Asset');
        $this->assertEquals('1001', $code);
    }

    public function test_get_standard_accounts_updates_dynamically()
    {
        ChartOfAccount::factory()->create([
            'account_type' => 'Asset',
            'account_name' => 'Cash in Hand', // Maps to 'Cash' pattern?
            'account_code' => '7777'
        ]);

        $mappings = $this->mappingService->getStandardAccounts();
        
        // "Cash" pattern in getStandardAccounts checks for 'Cash' or 'النقدية'
        // If we created "Cash in Hand", does simple LIKE '%Cash%' match?
        // Service uses: `where('account_name', 'like', "%$namePattern%")`
        
        $this->assertEquals('7777', $mappings['cash']);
    }
}
