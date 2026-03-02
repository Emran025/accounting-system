<?php

namespace Database\Factories;

use App\Models\Purchase;
use App\Models\Product;
use App\Models\ApSupplier;
use App\Models\User;
use App\Models\UniversalJournal;
use Illuminate\Database\Eloquent\Factories\Factory;

class PurchaseFactory extends Factory
{
    protected $model = Purchase::class;

    public function definition()
    {
        $price = $this->faker->randomFloat(2, 100, 5000);
        
        return [
            'product_id' => Product::factory(),
            'quantity' => $this->faker->numberBetween(1, 100),
            'invoice_price' => $price,
            'unit_type' => 'main',
            'production_date' => now()->subMonths(1),
            'expiry_date' => now()->addMonths(12),
            'supplier_id' => ApSupplier::factory(),
            'payment_type' => 'credit',
            'user_id' => User::factory(),
            'approval_status' => 'pending',
            'voucher_number' => function () {
                return UniversalJournal::factory()->create(['voucher_number' => 'PUR-' . $this->faker->unique()->numberBetween(10000, 99999)])->voucher_number;
            },
            'notes' => $this->faker->sentence,
            'created_at' => now(),
        ];
    }
}
