<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ZATCAService;
use App\Services\UBLGeneratorService;
use App\Services\QRCodeService;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Mockery;

/**
 * Test ZATCAService functionality
 */
class ZATCAServiceTest extends TestCase
{
    use RefreshDatabase;

    private ZATCAService $zatcaService;
    private UBLGeneratorService $ublGenerator;
    private QRCodeService $qrCodeService;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->ublGenerator = new UBLGeneratorService();
        $this->qrCodeService = new QRCodeService();
        $this->zatcaService = new ZATCAService($this->ublGenerator, $this->qrCodeService);
    }

    /**
     * Test that ZATCA is enabled when setting is true
     */
    public function test_is_enabled_when_setting_is_true(): void
    {
        Setting::create([
            'setting_key' => 'zatca_enabled',
            'setting_value' => '1',
        ]);

        $this->assertTrue($this->zatcaService->isEnabled());
    }

    /**
     * Test that ZATCA is enabled for Saudi Arabia
     */
    public function test_is_enabled_for_saudi_arabia(): void
    {
        Setting::create([
            'setting_key' => 'company_country',
            'setting_value' => 'SA',
        ]);

        $this->assertTrue($this->zatcaService->isEnabled());
    }

    /**
     * Test that invoice validation requires items
     */
    public function test_validate_invoice_requires_items(): void
    {
        $invoice = Invoice::factory()->create();
        
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invoice must have at least one item');
        
        $this->zatcaService->submitInvoice($invoice);
    }

    /**
     * Test that invoice validation requires invoice number
     */
    public function test_validate_invoice_requires_invoice_number(): void
    {
        $product = Product::factory()->create();
        $invoice = Invoice::factory()->create(['invoice_number' => null]);
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
        ]);
        
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invoice number is required');
        
        $this->zatcaService->submitInvoice($invoice);
    }

    /**
     * Test that invoice validation requires tax number
     */
    public function test_validate_invoice_requires_tax_number(): void
    {
        $product = Product::factory()->create();
        $invoice = Invoice::factory()->create();
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
        ]);
        
        // No tax number setting
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Company tax number must be configured');
        
        $this->zatcaService->submitInvoice($invoice);
    }

    /**
     * Test QR code data generation
     */
    public function test_generate_qr_code_data(): void
    {
        Setting::create([
            'setting_key' => 'company_name',
            'setting_value' => 'Test Company',
        ]);
        Setting::create([
            'setting_key' => 'tax_number',
            'setting_value' => '123456789012345',
        ]);

        $product = Product::factory()->create();
        $invoice = Invoice::factory()->create([
            'total_amount' => 1000.00,
            'vat_amount' => 150.00,
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
        ]);

        // Use reflection to test private method
        $reflection = new \ReflectionClass($this->zatcaService);
        $method = $reflection->getMethod('generateQRCodeData');
        $method->setAccessible(true);

        $qrData = $method->invoke($this->zatcaService, $invoice);

        $this->assertNotEmpty($qrData);
        $this->assertIsString($qrData);
        // Should be base64 encoded
        $this->assertTrue(base64_decode($qrData, true) !== false);
    }
}

