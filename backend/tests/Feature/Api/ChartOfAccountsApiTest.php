<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ChartOfAccountsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
    }

    public function test_can_list_accounts()
    {
        $response = $this->authGet(route('api.accounts.index'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'accounts']);
    }

    public function test_can_search_accounts()
    {
        $response = $this->authGet(route('api.accounts.index') . '?search=Cash');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_can_create_account()
    {
        $data = [
            'code' => '6100',
            'name' => 'Marketing Expense',
            'type' => 'expense',
        ];

        $response = $this->authPost(route('api.accounts.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('chart_of_accounts', [
            'account_code' => '6100',
            'account_name' => 'Marketing Expense',
        ]);
    }

    public function test_create_account_rejects_duplicate_code()
    {
        $data = [
            'code' => '1110', // Cash already seeded
            'name' => 'Duplicate',
            'type' => 'asset',
        ];

        $response = $this->authPost(route('api.accounts.store'), $data);

        $response->assertStatus(422);
    }

    public function test_can_update_account()
    {
        $account = ChartOfAccount::where('account_code', '1110')->firstOrFail();

        $data = [
            'name' => 'Cash and Cash Equivalents',
            'type' => 'asset',
        ];

        $response = $this->authPut(route('api.accounts.update', ['id' => $account->id]), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('chart_of_accounts', [
            'id' => $account->id,
            'account_name' => 'Cash and Cash Equivalents',
        ]);
    }

    public function test_delete_account_without_transactions()
    {
        $account = ChartOfAccount::factory()->asset()->create([
            'account_code' => '1999',
            'account_name' => 'Temporary',
        ]);

        $response = $this->authDelete(route('api.accounts.destroy', ['id' => $account->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('chart_of_accounts', ['id' => $account->id]);
    }

    public function test_delete_account_with_transactions_deactivates()
    {
        $account = ChartOfAccount::where('account_code', '1110')->firstOrFail();

        // Create GL entry referencing this account
        GeneralLedger::factory()->create([
            'account_id' => $account->id,
        ]);

        $response = $this->authDelete(route('api.accounts.destroy', ['id' => $account->id]));

        $this->assertSuccessResponse($response);
        // Account should be deactivated, not deleted
        $this->assertDatabaseHas('chart_of_accounts', [
            'id' => $account->id,
            'is_active' => false,
        ]);
    }

    public function test_can_get_account_balances()
    {
        $response = $this->authGet(route('api.accounts.balances'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'accounts', 'totals']);
    }

    public function test_can_filter_balances_by_type()
    {
        $response = $this->authGet(route('api.accounts.balances') . '?account_type=Asset');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }
}
