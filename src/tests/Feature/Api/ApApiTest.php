<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ApSupplier;
use App\Models\ApTransaction;
use App\Models\ChartOfAccount;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ApApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
        $this->seedMappings();
    }

    protected function seedMappings()
    {
        // Ensure mapping service can find accounts
        // The service typically looks for codes or specific flags. 
        // Based on TestCase::seedChartOfAccounts, we have:
        // 1110 (Cash), 5100 (COGS/Expense for test), 2210 (Output VAT), etc.
        // We probably need a Liabilty account for AP.
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2100',
            'account_name' => 'Accounts Payable',
        ]);
        
        // Expense for invoices
        ChartOfAccount::factory()->expense()->create([
            'account_code' => '5200',
            'account_name' => 'Operating Expenses',
        ]);
    }

    public function test_can_list_suppliers()
    {
        ApSupplier::factory()->count(3)->create();

        $response = $this->authGet(route('api.ap.suppliers'));

        $this->assertSuccessResponse($response);
        $this->assertEquals(3, $response->json('meta.total'));
    }

    public function test_can_create_supplier()
    {
        $data = [
            'name' => 'Test Supplier',
            'phone' => '123456789',
            'tax_number' => '300000000000003',
        ];

        $response = $this->authPost(route('api.ap.suppliers.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('ap_suppliers', ['name' => 'Test Supplier']);
        $this->assertDatabaseHas('telescope_entries', ['table_name' => 'ap_suppliers', 'operation' => 'CREATE']);
    }

    public function test_cannot_create_duplicate_supplier()
    {
        ApSupplier::factory()->create(['name' => 'Duplicate']);

        $response = $this->authPost(route('api.ap.suppliers.store'), ['name' => 'Duplicate']);

        $this->assertErrorResponse($response, 409);
    }

    public function test_can_create_invoice_transaction()
    {
        $supplier = ApSupplier::factory()->create();
        
        $data = [
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'amount' => 1000,
            'description' => 'Test Invoice',
            'date' => now()->toDateString(),
        ];

        $response = $this->authPost(route('api.ap.transactions.store'), $data);

        $this->assertSuccessResponse($response);
        
        $this->assertDatabaseHas('ap_transactions', [
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'amount' => 1000
        ]);

        // Access the updated data
        $supplier->refresh();
        $this->assertEquals(1000, $supplier->current_balance);
    }

    public function test_can_record_payment()
    {
        $supplier = ApSupplier::factory()->create(['current_balance' => 1000]);
        ApTransaction::factory()->create([
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'amount' => 1000
        ]);

        $data = [
            'supplier_id' => $supplier->id,
            'amount' => 500,
            'payment_method' => 'cash',
        ];

        $response = $this->authPost(route('api.ap.payments.store'), $data);

        $this->assertSuccessResponse($response);
        
        $supplier->refresh();
        $this->assertEquals(500, $supplier->current_balance); // 1000 - 500
    }

    public function test_supplier_ledger_returns_aging()
    {
        $supplier = ApSupplier::factory()->create();
        
        // Old invoice (>90 days)
        ApTransaction::factory()->create([
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'amount' => 100,
            'transaction_date' => now()->subDays(100),
        ]);

        // Recent invoice
        ApTransaction::factory()->create([
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'amount' => 200,
            'transaction_date' => now(),
        ]);

        $response = $this->authGet(route('api.ap.ledger', ['supplier_id' => $supplier->id]));

        $this->assertSuccessResponse($response);
        $this->assertEquals(100, $response->json('data.aging.over_90'));
        $this->assertEquals(200, $response->json('data.aging.current'));
    }
}
