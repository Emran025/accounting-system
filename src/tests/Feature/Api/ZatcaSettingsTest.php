<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ZatcaSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_get_zatca_settings()
    {
        Setting::create(['setting_key' => 'zatca_enabled', 'setting_value' => 'true']);
        Setting::create(['setting_key' => 'zatca_environment', 'setting_value' => 'sandbox']);
        Setting::create(['setting_key' => 'zatca_vat_number', 'setting_value' => '300000000000003']);

        $response = $this->authGet(route('api.settings.zatca'));

        $this->assertSuccessResponse($response);
        $response->assertJson([
            'settings' => [
                'zatca_enabled' => true,
                'zatca_environment' => 'sandbox',
                'zatca_vat_number' => '300000000000003'
            ]
        ]);
    }

    public function test_can_update_zatca_settings()
    {
        $payload = [
            'zatca_enabled' => 'true',
            'zatca_environment' => 'production',
            'zatca_vat_number' => '300000000000004'
        ];

        $response = $this->authPut(route('api.settings.zatca.update'), $payload);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('settings', ['setting_key' => 'zatca_environment', 'setting_value' => 'production']);
        $this->assertDatabaseHas('settings', ['setting_key' => 'zatca_vat_number', 'setting_value' => '300000000000004']);
    }

    public function test_can_onboard_zatca_api()
    {
        $payload = [
            'otp' => '123456',
            'csr_data' => [
                'vat_number' => '300000000000003',
                'org_name' => 'API Test Org'
            ]
        ];

        $response = $this->authPost(route('api.zatca.onboard'), $payload);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertDatabaseHas('settings', ['setting_key' => 'zatca_binary_token']);
    }
}
