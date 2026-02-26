<?php

namespace Database\Factories;

use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Currency>
 */
class CurrencyFactory extends Factory
{
    protected $model = Currency::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $currencies = [
            ['code' => 'SAR', 'name' => 'Saudi Riyal', 'symbol' => 'ر.س'],
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$'],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€'],
            ['code' => 'GBP', 'name' => 'British Pound', 'symbol' => '£'],
        ];
        
        $currency = fake()->randomElement($currencies);
        
        return [
            'code' => $currency['code'] . fake()->unique()->randomNumber(3),
            'name' => $currency['name'],
            'symbol' => $currency['symbol'],
            'exchange_rate' => fake()->randomFloat(4, 0.1, 5),
            'is_active' => true,
            'is_primary' => false,
        ];
    }

    /**
     * Create SAR (Saudi Riyal) as default
     */
    public function sar(): static
    {
        return $this->state(fn (array $attributes) => [
            'code' => 'SAR'. fake()->unique()->randomNumber(3),
            'name' => 'Saudi Riyal',
            'symbol' => 'ر.س',
            'exchange_rate' => 1.0000,
            'is_primary' => true,
        ]);
    }

    /**
     * Create USD
     */
    public function usd(): static
    {
        return $this->state(fn (array $attributes) => [
            'code' => 'USD'. fake()->unique()->randomNumber(3),
            'name' => 'US Dollar',
            'symbol' => '$',
            'exchange_rate' => 3.75,
        ]);
    }

    /**
     * Create as default (primary) currency
     */
    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_primary' => true,
        ]);
    }

    /**
     * Create inactive currency
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
