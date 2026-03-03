<?php

namespace Database\Factories;

use App\Models\ArTransaction;
use App\Models\ArCustomer;
use App\Models\User;
use App\Models\UniversalJournal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ArTransaction>
 */
class ArTransactionFactory extends Factory
{
    protected $model = ArTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => ArCustomer::factory(),
            'type' => fake()->randomElement(['invoice', 'payment', 'return']),
            'voucher_number' => function () {
                return UniversalJournal::factory()->create(['voucher_number' => 'ART-' . fake()->unique()->numerify('#####')])->voucher_number;
            },
            'description' => fake()->sentence(),
            'transaction_date' => now(),
            'created_by' => User::factory(),
            'is_deleted' => false,
        ];
    }

    /**
     * Create an invoice transaction
     */
    public function invoice(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'invoice',
        ]);
    }

    /**
     * Create a payment transaction
     */
    public function payment(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'payment',
        ]);
    }

    /**
     * Create a return transaction
     */
    public function return(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'return',
        ]);
    }
}
