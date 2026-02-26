<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\UBLGeneratorService;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ArCustomer;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Test UBLGeneratorService XML generation
 */
class UBLGeneratorServiceTest extends TestCase
{
    use RefreshDatabase;

    private UBLGeneratorService $ublGenerator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ublGenerator = new UBLGeneratorService();

        // Set up required company settings
        Setting::create([
            'setting_key' => 'company_name',
            'setting_value' => 'Test Company Ltd',
        ]);
        Setting::create([
            'setting_key' => 'tax_number',
            'setting_value' => '123456789012345',
        ]);
    }

    /**
     * Test that XML is generated for a simple invoice
     */
    public function test_generates_xml_for_simple_invoice(): void
    {
        $product = Product::factory()->create(['name' => 'Test Product']);
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-001',
            'total_amount' => 1150.00,
            'subtotal' => 1000.00,
            'vat_rate' => 0.15,
            'vat_amount' => 150.00,
        ]);

        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => 10,
            'unit_price' => 100.00,
            'subtotal' => 1000.00,
        ]);

        $xml = $this->ublGenerator->generate($invoice);

        $this->assertNotEmpty($xml);
        $this->assertStringContainsString('Invoice', $xml);
        $this->assertStringContainsString('INV-001', $xml);
        $this->assertStringContainsString('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2', $xml);
    }

    /**
     * Test that XML contains invoice ID
     */
    public function test_xml_contains_invoice_id(): void
    {
        $product = Product::factory()->create();
        $invoice = Invoice::factory()->create(['invoice_number' => 'INV-TEST-123']);
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
        ]);

        $xml = $this->ublGenerator->generate($invoice);

        $this->assertStringContainsString('INV-TEST-123', $xml);
    }

    /**
     * Test that XML contains tax information
     */
    public function test_xml_contains_tax_information(): void
    {
        $product = Product::factory()->create();
        $invoice = Invoice::factory()->create([
            'vat_rate' => 0.15,
            'vat_amount' => 150.00,
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
        ]);

        $xml = $this->ublGenerator->generate($invoice);

        $this->assertStringContainsString('TaxTotal', $xml);
        $this->assertStringContainsString('150.00', $xml);
    }

    /**
     * Test that XML contains invoice lines
     */
    public function test_xml_contains_invoice_lines(): void
    {
        $product = Product::factory()->create(['name' => 'Product A']);
        $invoice = Invoice::factory()->create();
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_price' => 200.00,
        ]);

        $xml = $this->ublGenerator->generate($invoice);

        $this->assertStringContainsString('InvoiceLine', $xml);
        $this->assertStringContainsString('Product A', $xml);
    }

    /**
     * Test that XML is valid XML structure
     */
    public function test_xml_is_valid_structure(): void
    {
        $product = Product::factory()->create();
        $invoice = Invoice::factory()->create();
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
        ]);

        $xml = $this->ublGenerator->generate($invoice);

        // Try to parse as XML
        $dom = new \DOMDocument();
        $result = @$dom->loadXML($xml);
        
        $this->assertTrue($result, 'Generated XML should be valid XML structure');
    }
}

