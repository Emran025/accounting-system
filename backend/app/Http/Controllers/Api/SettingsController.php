<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class SettingsController extends Controller
{
    use BaseApiController;

    public function index(): JsonResponse
    {


        $settings = Setting::all()
            ->pluck('setting_value', 'setting_key')
            ->toArray();

        return $this->successResponse(['settings' => $settings]);
    }

    public function getStoreSettings(): JsonResponse
    {

        
        $keys = ['store_name', 'store_address', 'store_phone', 'store_email', 'tax_number', 'cr_number'];
        $settings = Setting::whereIn('setting_key', $keys)->pluck('setting_value', 'setting_key')->toArray();
        
        // Ensure all keys exist
        foreach ($keys as $key) {
            if (!isset($settings[$key])) $settings[$key] = '';
        }

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function updateStoreSettings(Request $request): JsonResponse
    {

        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['setting_key' => $key], ['setting_value' => $value]);
        }

        return $this->successResponse([], 'Store settings updated');
    }

    public function getInvoiceSettings(): JsonResponse
    {

        
        $keys = ['show_logo', 'show_qr', 'zatca_enabled', 'footer_text', 'terms_text', 'invoice_size'];
        $settings = Setting::whereIn('setting_key', $keys)->pluck('setting_value', 'setting_key')->toArray();
        
        // Cast boolean values
        $settings['show_logo'] = isset($settings['show_logo']) ? filter_var($settings['show_logo'], FILTER_VALIDATE_BOOLEAN) : true;
        $settings['show_qr'] = isset($settings['show_qr']) ? filter_var($settings['show_qr'], FILTER_VALIDATE_BOOLEAN) : true;
        $settings['zatca_enabled'] = isset($settings['zatca_enabled']) ? filter_var($settings['zatca_enabled'], FILTER_VALIDATE_BOOLEAN) : false;

        foreach ($keys as $key) {
            if (!isset($settings[$key])) $settings[$key] = '';
        }

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function updateInvoiceSettings(Request $request): JsonResponse
    {

        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['setting_key' => $key], ['setting_value' => $value]);
        }

        return $this->successResponse([], 'Invoice settings updated');
    }

    public function update(Request $request): JsonResponse
    {
        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['setting_key' => $key],
                ['setting_value' => $value]
            );
        }

        return $this->successResponse([], 'Settings updated successfully');
    }

    public function getZatcaSettings(): JsonResponse
    {
        $keys = [
            'zatca_enabled',
            'zatca_environment',
            'zatca_vat_number',
            'zatca_org_name',
            'zatca_org_unit_name',
            'zatca_country_name',
            'zatca_common_name',
            'zatca_business_category',
            'zatca_otp',
            'zatca_csr',
            'zatca_private_key',
            'zatca_binary_token',
            'zatca_secret',
            'zatca_request_id',
            'zatca_compliance_status'
        ];
        
        $settings = Setting::whereIn('setting_key', $keys)->pluck('setting_value', 'setting_key')->toArray();
        
        // Default values
        if (!isset($settings['zatca_environment'])) $settings['zatca_environment'] = 'sandbox';
        if (!isset($settings['zatca_country_name'])) $settings['zatca_country_name'] = 'SA';
        if (!isset($settings['zatca_enabled'])) $settings['zatca_enabled'] = false;

        foreach ($keys as $key) {
            if (!isset($settings[$key])) $settings[$key] = '';
        }
        
        // Cast boolean
        $settings['zatca_enabled'] = filter_var($settings['zatca_enabled'], FILTER_VALIDATE_BOOLEAN);

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function updateZatcaSettings(Request $request): JsonResponse
    {
        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['setting_key' => $key], ['setting_value' => $value]);
        }

        return $this->successResponse([], 'ZATCA settings updated');
    }

    public function onboardZatca(Request $request, \App\Services\ZATCAService $zatcaService): JsonResponse
    {
        $otp = $request->input('otp');
        $csrData = $request->input('csr_data', []);
        
        $result = $zatcaService->onboard($otp, $csrData);
        
        return response()->json($result);
    }
}
