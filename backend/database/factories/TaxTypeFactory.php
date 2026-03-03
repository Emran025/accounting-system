<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\TaxAuthority;
/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TaxType>
 */
class TaxTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tax_authority_id' => TaxAuthority::factory(),
            'code' => $this->faker->unique()->lexify('TAX-???'),
            'name' => $this->faker->word,
            'calculation_type' => 'percentage',
            'is_active' => true,
        ];
    }
}
