<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Expense;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Models\FiscalPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class ExpensesApiTest extends TestCase
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

    public function test_can_list_expenses()
    {
        Expense::factory()->count(3)->create([
            'user_id' => $this->authenticatedUser->id,
        ]);

        $response = $this->authGet(route('api.expenses.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure([
            'success',
            'data',
            'pagination',
        ]);
    }

    public function test_can_create_expense_with_gl_posting()
    {
        $data = [
            'category' => 'rent',
            'amount' => 500.00,
            'expense_date' => now()->toDateString(),
            'description' => 'Monthly office rent',
            'payment_type' => 'cash',
        ];

        $response = $this->authPost(route('api.expenses.store'), $data);

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'id', 'voucher_number']);

        $voucherNumber = $response->json('voucher_number');

        // Verify double-entry GL postings
        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $voucherNumber,
            'entry_type' => 'DEBIT',
            'amount' => 500.00,
        ]);

        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $voucherNumber,
            'entry_type' => 'CREDIT',
            'amount' => 500.00,
        ]);
    }

    public function test_create_expense_validates_required_fields()
    {
        $response = $this->authPost(route('api.expenses.store'), []);

        $response->assertStatus(422);
    }

    public function test_can_update_expense_metadata()
    {
        $expense = Expense::factory()->create([
            'user_id' => $this->authenticatedUser->id,
            'category' => 'rent',
        ]);

        $data = [
            'id' => $expense->id,
            'category' => 'utilities',
            'description' => 'Updated description',
        ];

        $response = $this->authPut(route('api.expenses.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('expenses', [
            'id' => $expense->id,
            'category' => 'utilities',
        ]);
    }

    public function test_can_delete_expense_with_gl_reversal()
    {
        $data = [
            'category' => 'rent',
            'account_code' => '5100',
            'amount' => 500.00,
            'expense_date' => now()->toDateString(),
            'description' => 'Test delete',
            'payment_type' => 'cash',
        ];

        $response = $this->authPost(route('api.expenses.store'), $data);
        $this->assertSuccessResponse($response);
        
        $expenseId = $response->json('id');
        $voucherNumber = $response->json('voucher_number');

        $response = $this->authDelete(route('api.expenses.destroy'), ['id' => $expenseId]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('expenses', ['id' => $expenseId]);
    }

    public function test_credit_expense_posts_to_accounts_payable()
    {
        $data = [
            'category' => 'supplies',
            'amount' => 250.00,
            'expense_date' => now()->toDateString(),
            'payment_type' => 'credit',
        ];

        $response = $this->authPost(route('api.expenses.store'), $data);

        $this->assertSuccessResponse($response);
        $voucherNumber = $response->json('voucher_number');

        // Credit side should go to accounts payable (2110)
        $creditEntry = GeneralLedger::where('voucher_number', $voucherNumber)
            ->where('entry_type', 'CREDIT')
            ->first();

        $apAccount = ChartOfAccount::where('account_code', '2110')->first();
        $this->assertEquals($apAccount->id, $creditEntry->account_id);
    }
}
