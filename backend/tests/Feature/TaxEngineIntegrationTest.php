<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\TaxAuthority;
use App\Models\TaxType;
use App\Models\TaxRate;
use App\Models\Product;
use App\Models\ArCustomer;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\User;
use App\Services\SalesService;
use App\Services\Tax\TaxCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;

class TaxEngineIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->authenticateUser();
        
        // Turn ON the Tax Engine
        Config::set('tax.use_tax_engine', true);

        // Mock settings
        Setting::updateOrCreate(['setting_key' => 'company_country'], ['setting_value' => 'SA']);

        // Base Data
        $this->seedChartOfAccounts();
    }

    public function test_tax_engine_calculates_and_records_correct_tax_lines_and_gl_entries()
    {
        // 1. Setup Tax Elements Inputs
        $authority = TaxAuthority::updateOrCreate(
            ['code' => 'ZATCA'],
            [
                'country_code' => 'SA',
                'name' => 'Saudi Zakat, Tax and Customs Authority',
                'is_active' => true,
                'is_primary' => true,
            ]
        );

        $vatType = TaxType::updateOrCreate(
            ['tax_authority_id' => $authority->id, 'code' => 'VAT'],
            [
                'name' => 'Value Added Tax',
                'calculation_type' => 'percentage',
                'base_on' => 'subtotal',
                'is_active' => true,
            ]
        );

        $vatRate = TaxRate::updateOrCreate(
            ['tax_type_id' => $vatType->id, 'rate' => 0.15],
            [
                'rate_name' => 'Standard VAT 15%',
                'gl_account_code' => '2210',
                'is_active' => true,
            ]
        );

        // 2. Mock Operational Data
        $customer = ArCustomer::factory()->create([
            'name' => 'Test Tax Customer',
        ]);

        $product = Product::factory()->create([
            'name' => 'Taxable Widget',
            'unit_price' => 1000.00, // Important for easy math
            'stock_quantity' => 100,
            'weighted_average_cost' => 500, // COGS math
        ]);

        $invoiceData = [
            'customer_id' => $customer->id,
            'payment_type' => 'credit',
            'user_id' => $this->authenticatedUser->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                    'unit_price' => 1000.00,
                    'unit_type' => 'sub',
                ]
            ],
            'invoice_number' => 'TEST-TAX-001',
        ];

        // Ensure SalesService is properly constructed via DIC
        $salesService = app(SalesService::class);
        $invoiceId = $salesService->createInvoice($invoiceData);

        // 3. Verify Output Logic & True Tables
        
        // Assert Document Creation
        $invoice = Invoice::with(['taxLines', 'glEntries', 'items'])->find($invoiceId);
        $this->assertNotNull($invoice);
        $this->assertEquals('TEST-TAX-001', $invoice->invoice_number);

        // Assert Tax Lines Calculation (1000 * 0.15 = 150)
        $this->assertCount(1, $invoice->taxLines);
        $taxLine = $invoice->taxLines->first();
        $this->assertEquals(0.15, (float)$taxLine->rate);
        $this->assertEquals(150.00, (float)$taxLine->tax_amount);
        $this->assertEquals(1000.00, (float)$taxLine->taxable_amount);
        $this->assertEquals('VAT', $taxLine->tax_type_code);

        // Assert GL Entries (Full AR, Net Sales, Tax, COGS, Inventory)
        // Total Invoiced = 1150 (DR AR)
        // Revenue = 1000 (CR Sales)
        // Tax = 150 (CR Tax Liability)
        // COGS = 500 (DR)
        // Inventory = 500 (CR)

        $glEntries = GeneralLedger::where('voucher_number', $invoice->voucher_number)->get();
        
        // 1. Check AR Entry (Debit)
        $arLedgerEntry = $glEntries->where('account_id', ChartOfAccount::where('account_code', '1120')->first()->id)->first();
        $this->assertNotNull($arLedgerEntry, 'AR entry missing');
        $this->assertEquals('DEBIT', $arLedgerEntry->entry_type);
        $this->assertEquals(1150.00, (float)$arLedgerEntry->amount);

        // 2. Check Sales Entry (Credit)
        $salesLedgerEntry = $glEntries->where('account_id', ChartOfAccount::where('account_code', '4100')->first()->id)->first();
        $this->assertNotNull($salesLedgerEntry, 'Sales entry missing');
        $this->assertEquals('CREDIT', $salesLedgerEntry->entry_type);
        $this->assertEquals(1000.00, (float)$salesLedgerEntry->amount);

        // 3. Check Tax Entry (Credit)
        $taxLedgerEntry = $glEntries->where('account_id', ChartOfAccount::where('account_code', '2210')->first()->id)->first();
        $this->assertNotNull($taxLedgerEntry, 'Tax entry missing');
        $this->assertEquals('CREDIT', $taxLedgerEntry->entry_type);
        $this->assertEquals(150.00, (float)$taxLedgerEntry->amount);

        // 4. Check Customer Balance Update
        $this->assertEquals(1150.00, (float)$customer->fresh()->current_balance);
        
        // Final Document Status
        $this->assertNotEmpty($invoice->voucher_number);
    }
}
