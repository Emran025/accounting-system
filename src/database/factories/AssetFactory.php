<?php

namespace Database\Factories;

use App\Models\Asset;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition()
    {
        return [
            'asset_name' => $this->faker->word . ' Asset',
            'purchase_date' => now()->subYears(1),
            'purchase_value' => $this->faker->randomFloat(2, 5000, 50000),
            'salvage_value' => $this->faker->randomFloat(2, 500, 5000),
            'useful_life_years' => 5,
            'depreciation_method' => 'straight_line',
            'is_active' => true,
            'accumulated_depreciation' => 0,
            'depreciation_rate' => 20, // For declining balance
        ];
    }
}
