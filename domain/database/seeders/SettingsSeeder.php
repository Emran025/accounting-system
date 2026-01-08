<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'store_name' => 'سوبر ماركت الوفاء',
            'store_address' => 'اليمن - صنعاء - شارع الستين',
            'store_phone' => '777123456',
            'invoice_size' => 'thermal',
            'currency_symbol' => 'ر.ي',
            'tax_number' => '123456789',
            'footer_message' => 'شكراً لزيارتكم .. نأمل رؤيتكم قريباً',
            'purchase_approval_threshold' => '10000',
            'inventory_method' => 'perpetual',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['setting_key' => $key],
                ['setting_value' => $value]
            );
        }
    }
}
