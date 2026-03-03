<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ApSupplier;
use App\Models\ApTransaction;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\UniversalJournal;
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
        $this->assertEquals(3, $response->json('pagination.total_records'));

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
        $this->assertDatabaseHas('telescope', ['table_name' => 'ap_suppliers', 'operation' => 'CREATE']);
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
        ]);

        // Access the updated data
        $supplier->refresh();
        $this->assertEquals(1000, $supplier->current_balance);
    }

    public function test_can_record_payment()
    {
        $supplier = ApSupplier::factory()->create(['current_balance' => 1000]);
        $invoiceVoucher = 'TEST-INV-PAY';
        UniversalJournal::factory()->create(['voucher_number' => $invoiceVoucher, 'document_type' => 'ap_transactions']);
        
        ApTransaction::factory()->create([
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'voucher_number' => $invoiceVoucher,
        ]);

        // Seed GL for the invoice (Credit AP)
        \App\Models\GeneralLedger::factory()->create([
            'voucher_number' => $invoiceVoucher,
            'account_id' => ChartOfAccount::where('account_code', '2110')->first()->id,
            'entry_type' => 'CREDIT',
            'amount' => 1000,
        ]);

        $data = [
            'supplier_id' => $supplier->id,
            'amount' => 500,
            'payment_method' => 'cash',
            'date' => now()->toDateString(),
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
        UniversalJournal::factory()->create(['voucher_number' => 'V-OLD', 'document_type' => 'invoices']);
        $inv1 = ApTransaction::factory()->create([
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'transaction_date' => now()->subDays(100),
            'voucher_number' => 'V-OLD',
        ]);
        GeneralLedger::factory()->create([
            'voucher_number' => 'V-OLD',
            'account_id' => ChartOfAccount::where('account_code', '2110')->value('id'),
            'entry_type' => 'CREDIT',
            'amount' => 100,
            'voucher_date' => now()->subDays(100),
        ]);

        // Recent invoice
        UniversalJournal::factory()->create(['voucher_number' => 'V-NEW', 'document_type' => 'invoices']);
        $inv2 = ApTransaction::factory()->create([
            'supplier_id' => $supplier->id,
            'type' => 'invoice',
            'transaction_date' => now(),
            'voucher_number' => 'V-NEW',
        ]);
        GeneralLedger::factory()->create([
            'voucher_number' => 'V-NEW',
            'account_id' => ChartOfAccount::where('account_code', '2110')->value('id'),
            'entry_type' => 'CREDIT',
            'amount' => 200,
            'voucher_date' => now(),
        ]);

        $response = $this->authGet(route('api.ap.ledger', ['supplier_id' => $supplier->id]));

        $this->assertSuccessResponse($response);
        $this->assertEquals(100, $response->json('aging.over_90'));
        $this->assertEquals(200, $response->json('aging.current'));

    }
}
