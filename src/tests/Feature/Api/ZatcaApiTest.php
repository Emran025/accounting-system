<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Invoice;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ZatcaApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        
        // Mock storage for certificates
        \Illuminate\Support\Facades\Storage::fake('local');
        \Illuminate\Support\Facades\Storage::disk('local')->put('zatca/certificate.pem', 'dummy content');
        \Illuminate\Support\Facades\Storage::disk('local')->put('zatca/private_key.pem', 'dummy content');

        // Enable ZATCA and set tax number
        Setting::create(['setting_key' => 'zatca_enabled', 'setting_value' => 'true']);
        Setting::create(['setting_key' => 'tax_number', 'setting_value' => '123456789012345']);
        Setting::create(['setting_key' => 'company_name', 'setting_value' => 'Test Company']);
    }

    public function test_can_submit_invoice_to_zatca()
    {
        $invoice = Invoice::factory()->create([
            'invoice_number' => 'INV-2024-001',
            'vat_amount' => 15.00,
            'total_amount' => 115.00
        ]);
        
        \App\Models\InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'quantity' => 1,
            'unit_price' => 100.00,
            'subtotal' => 100.00
        ]);

        $response = $this->authPost(route('api.zatca.submit', ['invoice_id' => $invoice->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('zatca_einvoices', ['invoice_id' => $invoice->id, 'status' => 'submitted']);
    }
    
    public function test_skips_if_disabled()
    {
        Setting::where('setting_key', 'zatca_enabled')->update(['setting_value' => 'false']);
        
        $invoice = Invoice::factory()->create();
        \App\Models\InvoiceItem::factory()->create(['invoice_id' => $invoice->id]);

        $response = $this->authPost(route('api.zatca.submit', ['invoice_id' => $invoice->id]));
        
        $response->assertJson(['status' => 'skipped']);
    }
}
