<?php

namespace Database\Factories;

use App\Models\ArCustomer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ArCustomer>
 */
class ArCustomerFactory extends Factory
{
    protected $model = ArCustomer::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'contact_person' => fake()->name(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->address(),
            'tax_number' => fake()->optional()->numerify('###-####-####'),
            'credit_limit' => fake()->randomFloat(2, 1000, 50000),
            'payment_terms' => fake()->numberBetween(15, 60),
            'is_active' => true,
        ];
    }

    /**
     * Create an inactive customer
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Create a customer with no credit limit
     */
    public function noCreditLimit(): static
    {
        return $this->state(fn (array $attributes) => [
            'credit_limit' => 0,
        ]);
    }

    /**
     * Create a VIP customer with high credit limit
     */
    public function vip(): static
    {
        return $this->state(fn (array $attributes) => [
            'credit_limit' => fake()->randomFloat(2, 100000, 500000),
            'payment_terms' => 90,
        ]);
    }
}
