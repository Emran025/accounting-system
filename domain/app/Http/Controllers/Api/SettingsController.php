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
        PermissionService::requirePermission('settings', 'view');

        $settings = Setting::all()
            ->pluck('setting_value', 'setting_key')
            ->toArray();

        return $this->successResponse(['settings' => $settings]);
    }

    public function getStoreSettings(): JsonResponse
    {
        PermissionService::requirePermission('settings', 'view');
        
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
        PermissionService::requirePermission('settings', 'edit');
        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['setting_key' => $key], ['setting_value' => $value]);
        }

        return $this->successResponse([], 'Store settings updated');
    }

    public function getInvoiceSettings(): JsonResponse
    {
        PermissionService::requirePermission('settings', 'view');
        
        $keys = ['show_logo', 'show_qr', 'footer_text', 'terms_text', 'invoice_size'];
        $settings = Setting::whereIn('setting_key', $keys)->pluck('setting_value', 'setting_key')->toArray();
        
        // Cast boolean values
        if (isset($settings['show_logo'])) $settings['show_logo'] = (bool)$settings['show_logo'];
        else $settings['show_logo'] = true;

        if (isset($settings['show_qr'])) $settings['show_qr'] = (bool)$settings['show_qr'];
        else $settings['show_qr'] = true;

        foreach ($keys as $key) {
            if (!isset($settings[$key])) $settings[$key] = '';
        }

        return response()->json(['success' => true, 'settings' => $settings]);
    }

    public function updateInvoiceSettings(Request $request): JsonResponse
    {
        PermissionService::requirePermission('settings', 'edit');
        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['setting_key' => $key], ['setting_value' => $value]);
        }

        return $this->successResponse([], 'Invoice settings updated');
    }

    public function update(Request $request): JsonResponse
    {
        PermissionService::requirePermission('settings', 'edit');

        $settings = $request->all();

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['setting_key' => $key],
                ['setting_value' => $value]
            );
        }

        return $this->successResponse([], 'Settings updated successfully');
    }
}
