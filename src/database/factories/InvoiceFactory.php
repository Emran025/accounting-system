<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\User;
use App\Models\ArCustomer;
use App\Models\Currency;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invoice>
 */
class InvoiceFactory extends Factory
{
    protected $model = Invoice::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 100, 5000);
        $vatRate = 0.15;
        $vatAmount = round($subtotal * $vatRate, 2);
        $total = $subtotal + $vatAmount;
        
        return [
            'invoice_number' => 'INV-' . fake()->unique()->numerify('######'),
            'voucher_number' => 'VCH-' . fake()->unique()->numerify('######'),
            'subtotal' => $subtotal,
            'vat_rate' => $vatRate,
            'vat_amount' => $vatAmount,
            'discount_amount' => 0,
            'total_amount' => $total,
            'payment_type' => fake()->randomElement(['cash', 'credit', 'bank_transfer', 'card']),
            'customer_id' => ArCustomer::factory(),
            'user_id' => User::factory(),
            'amount_paid' => $total, // Paid in full by default
            'is_reversed' => false,
            'reversed_at' => null,
            'reversed_by' => null,
            'currency_id' => Currency::factory()->sar(),
            'exchange_rate' => 1.0000,
        ];
    }

    /**
     * Create a credit invoice (unpaid)
     */
    public function credit(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_type' => 'credit',
            'amount_paid' => 0,
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
