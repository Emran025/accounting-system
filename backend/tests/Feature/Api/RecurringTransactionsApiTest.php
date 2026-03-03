<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\RecurringTransaction;
use App\Models\FiscalPeriod;
use App\Models\GeneralLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class RecurringTransactionsApiTest extends TestCase
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

    public function test_can_list_recurring_transactions()
    {
        RecurringTransaction::create([
            'name' => 'Monthly Rent',
            'type' => 'expense',
            'frequency' => 'monthly',
            'next_due_date' => now()->addMonth()->toDateString(),
            'template_data' => ['account_code' => '5100', 'amount' => 1000, 'description' => 'Monthly Rent'],
        ]);

        $response = $this->authGet(route('api.recurring.index'));

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_can_create_recurring_transaction()
    {
        $data = [
            'name' => 'Weekly Supplies',
            'type' => 'expense',
            'frequency' => 'weekly',
            'next_due_date' => now()->addWeek()->toDateString(),
            'template_data' => [
                'account_code' => '5100',
                'amount' => 200,
                'description' => 'Weekly Supplies',
            ],
        ];

        $response = $this->authPost(route('api.recurring.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('recurring_transactions', ['name' => 'Weekly Supplies']);
    }

    public function test_can_update_recurring_transaction()
    {
        $template = RecurringTransaction::create([
            'name' => 'Old Name',
            'type' => 'expense',
            'frequency' => 'monthly',
            'next_due_date' => now()->addMonth()->toDateString(),
            'template_data' => ['account_code' => '5100', 'amount' => 100, 'description' => 'Test'],
        ]);

        $data = [
            'id' => $template->id,
            'name' => 'Updated Name',
            'type' => 'expense',
            'frequency' => 'quarterly',
            'next_due_date' => now()->addMonths(3)->toDateString(),
            'template_data' => ['account_code' => '5100', 'amount' => 300, 'description' => 'Updated'],
        ];

        $response = $this->authPut(route('api.recurring.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('recurring_transactions', [
            'id' => $template->id,
            'name' => 'Updated Name',
            'frequency' => 'quarterly',
        ]);
    }

    public function test_can_delete_recurring_transaction()
    {
        $template = RecurringTransaction::create([
            'name' => 'To Delete',
            'type' => 'expense',
            'frequency' => 'monthly',
            'next_due_date' => now()->addMonth()->toDateString(),
            'template_data' => ['account_code' => '5100', 'amount' => 100, 'description' => 'Delete Me'],
        ]);

        $response = $this->authDelete(route('api.recurring.destroy', ['id' => $template->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('recurring_transactions', ['id' => $template->id]);
    }

    public function test_can_process_expense_transaction()
    {
        $template = RecurringTransaction::create([
            'name' => 'Process Me',
            'type' => 'expense',
            'frequency' => 'monthly',
            'next_due_date' => now()->toDateString(),
            'template_data' => [
                'account_code' => '5100',
                'amount' => 500,
                'description' => 'Recurring Expense',
            ],
        ]);

        $response = $this->authPost(route('api.recurring.process'), [
            'template_id' => $template->id,
            'generation_date' => now()->toDateString(),
        ]);

        $this->assertSuccessResponse($response);

        // Verify GL entries were created
        $voucherNumber = $response->json('voucher_number');
        $this->assertNotNull($voucherNumber);

        // Verify next_due_date was updated
        $this->assertNotEquals(
            now()->toDateString(),
            $template->fresh()->next_due_date
        );
    }

    public function test_create_validates_required_fields()
    {
        $response = $this->authPost(route('api.recurring.store'), []);

        $response->assertStatus(422);
    }
}
