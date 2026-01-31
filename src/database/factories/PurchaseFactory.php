<?php

namespace Database\Factories;

use App\Models\Purchase;
use App\Models\Product;
use App\Models\ApSupplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseFactory extends Factory
{
    protected $model = Purchase::class;

    public function definition()
    {
        $price = $this->faker->randomFloat(2, 100, 5000);
        $vatRate = 0.15;
        $vatAmount = ($price * $vatRate) / (1 + $vatRate); // Assuming price is gross or logic handled
        
        // Match Service Logic: 
        // Service calculates vat from invoice_price (gross).
        // Let's assume invoice_price is gross.
        
        return [
            'product_id' => Product::factory(),
            'quantity' => $this->faker->numberBetween(1, 100),
            'invoice_price' => $price,
            'unit_type' => 'main',
            'production_date' => now()->subMonths(1),
            'expiry_date' => now()->addMonths(12),
            'supplier_id' => ApSupplier::factory(),
            'payment_type' => 'credit',
            'vat_rate' => 15.00,
            'vat_amount' => round($vatAmount, 2),
            'user_id' => User::factory(),
            'approval_status' => 'pending',
            'voucher_number' => 'PUR-' . $this->faker->unique()->numberBetween(1000, 9999),
            'notes' => $this->faker->sentence,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
