<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Currency;
use App\Models\CurrencyDenomination;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        // Primary: Yemeni Rial
        if (!Currency::where('code', 'YER')->exists()) {
            $yer = Currency::create([
                'code' => 'YER',
                'name' => 'Yemeni Rial',
                'symbol' => 'ر.ي',
                'exchange_rate' => 1.0000,
                'is_primary' => true,
                'is_active' => true,
            ]);

            $yerDenominations = [100, 200, 250, 500, 1000];
            foreach ($yerDenominations as $val) {
                CurrencyDenomination::create([
                    'currency_id' => $yer->id,
                    'value' => $val,
                    'label' => $val . ' Rial',
                ]);
            }
        }

        // Foreign Currencies
        $foreign = [
            ['code' => 'SAR', 'name' => 'Saudi Riyal', 'symbol' => 'ر.س', 'rate' => 140.00], // Example rate
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'rate' => 530.00], 
            ['code' => 'AED', 'name' => 'UAE Dirham', 'symbol' => 'AED', 'rate' => 144.00],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'rate' => 570.00],
            ['code' => 'GBP', 'name' => 'British Pound', 'symbol' => '£', 'rate' => 670.00],
        ];

        foreach ($foreign as $curr) {
            if (!Currency::where('code', $curr['code'])->exists()) {
                Currency::create([
                    'code' => $curr['code'],
                    'name' => $curr['name'],
                    'symbol' => $curr['symbol'],
                    'exchange_rate' => $curr['rate'],
                    'is_primary' => false,
                    'is_active' => true,
                ]);
            }
        }
    }
}
