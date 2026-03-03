<?php

namespace Database\Factories;

use App\Models\CurrencyPolicy;
use App\Enums\ConversionTiming;
use App\Enums\CurrencyPolicyType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CurrencyPolicy>
 */
class CurrencyPolicyFactory extends Factory
{
    protected $model = CurrencyPolicy::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'code' => strtoupper(fake()->unique()->lexify('POL-????')),
            'description' => fake()->sentence(),
            'policy_type' => fake()->randomElement(CurrencyPolicyType::cases()),
            'requires_reference_currency' => true,
            'allow_multi_currency_balances' => true,
            'conversion_timing' => fake()->randomElement(ConversionTiming::cases()),
            'revaluation_enabled' => false,
            'revaluation_frequency' => 'monthly',
            'exchange_rate_source' => 'MANUAL',
            'is_active' => false,
        ];
    }

    /**
     * Create an active policy
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => true,
        ]);
    }
}
