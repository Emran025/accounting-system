<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\User;
use App\Models\ArCustomer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * SAP FI: Invoice factory creates a document with NO amounts.
 * Amounts are derived from GL entries, tax_lines, and invoice_items.
 *
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    public function definition(): array
    {
        return [
            'invoice_number' => 'INV-' . fake()->unique()->numerify('######'),
            'voucher_number' => 'VCH-' . fake()->unique()->numerify('######'),
            'payment_type' => fake()->randomElement(['cash', 'credit']),
            'customer_id' => ArCustomer::factory(),
            'user_id' => User::factory(),
            'is_reversed' => false,
            'reversed_at' => null,
            'reversed_by' => null,
        ];
    }

    /**
     * Create a credit invoice
     */
    public function credit(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_type' => 'credit',
        ]);
    }

    /**
     * Create a reversed invoice
     */
    public function reversed(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_reversed' => true,
            'reversed_at' => now(),
            'reversed_by' => User::factory(),
        ]);
    }
}
