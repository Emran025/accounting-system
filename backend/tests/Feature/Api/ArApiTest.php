<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ArCustomer;
use App\Models\ArTransaction;
use App\Models\GeneralLedger;
use App\Models\FiscalPeriod;
use App\Models\UniversalJournal;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class ArApiTest extends TestCase
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

    // ── AR Customers ──

    public function test_can_list_customers()
    {
        ArCustomer::factory()->count(3)->create();

        $response = $this->authGet(route('api.ar.customers'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data', 'pagination']);
    }

    public function test_can_create_customer()
    {
        $data = [
            'name' => 'Acme Corp',
            'phone' => '0501234567',
            'email' => 'acme@test.com',
            'address' => '123 Business St',
            'tax_number' => '300000000000003',
        ];

        $response = $this->authPost(route('api.ar.customers.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('ar_customers', ['name' => 'Acme Corp']);
    }

    public function test_can_update_customer()
    {
        $customer = ArCustomer::factory()->create(['name' => 'Old Name']);

        $data = [
            'id' => $customer->id,
            'name' => 'New Name',
        ];

        $response = $this->authPut(route('api.ar.customers.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('ar_customers', [
            'id' => $customer->id,
            'name' => 'New Name',
        ]);
    }

    public function test_can_delete_customer()
    {
        $customer = ArCustomer::factory()->create();

        $response = $this->authDelete(route('api.ar.customers.destroy'), ['id' => $customer->id]);

        $this->assertSuccessResponse($response);
    }

    public function test_can_view_customer_ledger()
    {
        $customer = ArCustomer::factory()->create();

        $response = $this->authGet(route('api.ar.ledger') . '?customer_id=' . $customer->id);

        $this->assertSuccessResponse($response);
    }

    // ── AR Transactions ──

    public function test_can_list_ar_transactions()
    {
        $customer = ArCustomer::factory()->create();
        ArTransaction::factory()->count(2)->create([
            'customer_id' => $customer->id,
        ]);

        $response = $this->authGet(route('api.ar.transactions'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'data', 'pagination']);
    }

    public function test_can_create_receipt_transaction()
    {
        $customer = ArCustomer::factory()->create();

        $data = [
            'customer_id' => $customer->id,
            'type' => 'receipt',
            'amount' => 500.00,
            'description' => 'Test Receipt',
            'date' => now()->toDateString(),
        ];

        $response = $this->authPost(route('api.ar.transactions.store'), $data);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('ar_transactions', [
            'customer_id' => $customer->id,
            'type' => 'receipt',
        ]);

        // Verify GL entries
        $transaction = ArTransaction::where('customer_id', $customer->id)->first();
        $this->assertNotNull($transaction->voucher_number);

        $glEntries = GeneralLedger::where('voucher_number', $transaction->voucher_number)->count();
        $this->assertGreaterThanOrEqual(2, $glEntries);
    }

    public function test_can_delete_ar_transaction()
    {
        $customer = ArCustomer::factory()->create();
        $voucher = UniversalJournal::factory()->create();
        $transaction = ArTransaction::factory()->create([
            'customer_id' => $customer->id,
            'type' => 'receipt',
            'voucher_number' => $voucher->voucher_number,
        ]);

        $account1 = ChartOfAccount::firstOrCreate(['account_code' => '1100'], ['account_name' => 'Cash', 'account_type' => 'Asset']);
        $account2 = ChartOfAccount::firstOrCreate(['account_code' => '1200'], ['account_name' => 'AR', 'account_type' => 'Asset']);

        GeneralLedger::factory()->create([
            'voucher_number' => $voucher->voucher_number,
            'account_id' => $account1->id, // Cash
            'entry_type' => 'DEBIT',
            'amount' => 100,
            'reference_type' => 'ar_transactions',
            'reference_id' => $transaction->id,
        ]);
        GeneralLedger::factory()->create([
            'voucher_number' => $voucher->voucher_number,
            'account_id' => $account2->id, // AR
            'entry_type' => 'CREDIT',
            'amount' => 100,
            'reference_type' => 'ar_transactions',
            'reference_id' => $transaction->id,
        ]);

        $response = $this->authDelete(route('api.ar.transactions.destroy', ['id' => $transaction->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('ar_transactions', [
            'id' => $transaction->id,
            'is_deleted' => true,
        ]);
    }

    public function test_cannot_delete_invoice_type_ar_transaction()
    {
        $customer = ArCustomer::factory()->create();
        $transaction = ArTransaction::factory()->create([
            'customer_id' => $customer->id,
            'type' => 'invoice',
        ]);

        $response = $this->authDelete(route('api.ar.transactions.destroy', ['id' => $transaction->id]));

        $this->assertErrorResponse($response, 400);
    }

    public function test_create_ar_transaction_validates_fields()
    {
        $response = $this->authPost(route('api.ar.transactions.store'), []);

        $response->assertStatus(422);
    }
}
