<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ArCustomer;
use App\Models\ChartOfAccount;
use App\Models\User;
use App\Services\SalesService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use App\Services\InventoryCostingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use App\Models\FiscalPeriod;
use App\Models\GeneralLedger;
use Mockery;

class SalesServiceTest extends TestCase
{
    use RefreshDatabase;

    private SalesService $salesService;
    private $costingServiceMock;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seedAccounts();
        
        $ledgerService = new LedgerService();
        $coaService = new ChartOfAccountsMappingService();
        $this->costingServiceMock = Mockery::mock(InventoryCostingService::class);
        
        // Mock method calls expected during invoice creation
        $this->costingServiceMock->shouldReceive('recordSale')
            ->andReturn(50.00); // Dummy COGS value based on logic

        // Create fiscal period for current date
        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);

        $this->salesService = new SalesService(
            $ledgerService,
            $coaService,
            $this->costingServiceMock
        );
    }

    private function seedAccounts()
    {
        // Create necessary accounts for sales transaction
        // Cash
        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1110',
            'account_name' => 'Cash',
            'account_type' => 'Asset'
        ]);
        
        // Accounts Receivable
        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1120',
            'account_name' => 'Accounts Receivable',
            'account_type' => 'Asset'
        ]);

        // Inventory
        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1130',
            'account_name' => 'Inventory',
            'account_type' => 'Asset'
        ]);
        
        // Sales Revenue
        ChartOfAccount::factory()->revenue()->create([
            'account_code' => '4100',
            'account_name' => 'Sales Revenue',
            'account_type' => 'Revenue'
        ]);
        
        // Output VAT
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2210',
            'account_name' => 'Output VAT',
            'account_type' => 'Liability'
        ]);
        
        // COGS
        ChartOfAccount::factory()->expense()->create([
            'account_code' => '5100',
            'account_name' => 'Cost of Goods Sold',
            'account_type' => 'Expense'
        ]);
    }

    public function test_create_invoice_with_items()
    {
        $user = User::factory()->create();
        $customer = ArCustomer::factory()->create();
        $product = Product::factory()->create([
            'unit_price' => 100,
            'stock_quantity' => 10,
            'weighted_average_cost' => 50,
            'minimum_profit_margin' => 0
        ]);

        // Seed costing layer
        app(\App\Services\InventoryCostingService::class)->recordPurchase($product->id, 1, 10, 50.00, 500.00);

        $data = [
            'customer_id' => $customer->id,
            'payment_type' => 'cash',
            'invoice_date' => now()->toDateString(),
            'notes' => 'Test invoice',
            'user_id' => $user->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => 100,
                    'discount' => 0,
                    'tax_rate' => 0.15
                ]
            ]
        ];

        $invoiceId = $this->salesService->createInvoice($data);
        $invoice = Invoice::find($invoiceId);

        // Verify Invoice creation
        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'customer_id' => $customer->id,
            'subtotal' => 200.00,
            'vat_amount' => 30.00,
            'total_amount' => 230.00
        ]);

        // Verify Items
        $this->assertDatabaseHas('invoice_items', [
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'subtotal' => 200.00
        ]);

        // Verify Stock Update
        $this->assertEquals(8, $product->fresh()->stock_quantity);

        // Verify GL Entries
        // Verify GL Entries
        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $invoice->voucher_number,
            'amount' => 230.00,
            'entry_type' => 'DEBIT'
        ]);

        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $invoice->voucher_number,
            'amount' => 200.00,
            'entry_type' => 'CREDIT'
        ]);

        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $invoice->voucher_number,
            'amount' => 30.00,
            'entry_type' => 'CREDIT'
        ]);
    }

    public function test_delete_invoice_reverses_entries_and_restores_stock()
    {
        // Setup existing invoice
        $invoice = Invoice::factory()->create([
            'is_reversed' => false,
            'total_amount' => 115,
            'amount_paid' => 0,
            'payment_type' => 'cash'
        ]);
        
        $product = Product::factory()->create(['stock_quantity' => 10]);
        
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => 1
        ]);

        // Manually create GL entries for this invoice so deletion can reverse them
        $voucherNumber = 'VCH-TEST-001';
        $invoice->update(['voucher_number' => $voucherNumber]);
        
        GeneralLedger::factory()->create([
            'voucher_number' => $voucherNumber,
            'account_id' => $this->debitAccount->id ?? ChartOfAccount::factory()->asset()->create()->id,
            'entry_type' => 'DEBIT',
            'amount' => 115,
            'reference_type' => 'invoices',
            'reference_id' => $invoice->id,
            'description' => 'Original Invoice Entry'
        ]);

        GeneralLedger::factory()->create([
            'voucher_number' => $voucherNumber,
            'account_id' => $this->creditAccount->id ?? ChartOfAccount::factory()->revenue()->create()->id,
            'entry_type' => 'CREDIT',
            'amount' => 115,
            'reference_type' => 'invoices',
            'reference_id' => $invoice->id,
            'description' => 'Original Invoice Entry'
        ]);

        // Mock COGS reversal (return negative or ignore, depending on impl)
        // Ideally deleteInvoice might not call costing service for cost reversal directly or might...
        // Let's assume deleteInvoice logic handles it.

        $result = $this->salesService->deleteInvoice($invoice->id);

        $this->assertTrue($result);
        $this->assertTrue($invoice->fresh()->is_reversed);
        
        // Stock restored
        $this->assertEquals(11, $product->fresh()->stock_quantity);
        
        // Reversal entries exist
        $this->assertDatabaseHas('general_ledger', [
            'is_closed' => false,
            'description' => "Reversal for deleted Invoice #{$invoice->invoice_number}"
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
