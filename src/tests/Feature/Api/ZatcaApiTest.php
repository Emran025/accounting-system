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
        // Enable ZATCA
        Setting::create(['setting_key' => 'zatca_enabled', 'setting_value' => 'true']);
    }

    public function test_can_submit_invoice_to_zatca()
    {
        $invoice = Invoice::factory()->create();

        $response = $this->authPost(route('api.zatca.submit', ['invoice_id' => $invoice->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('zatca_einvoices', ['invoice_id' => $invoice->id, 'status' => 'submitted']);
    }
    
    public function test_skips_if_disabled()
    {
        Setting::where('setting_key', 'zatca_enabled')->update(['setting_value' => 'false']);
        $invoice = Invoice::factory()->create();

        $response = $this->authPost(route('api.zatca.submit', ['invoice_id' => $invoice->id]));
        
        $response->assertJson(['status' => 'skipped']);
    }
}
