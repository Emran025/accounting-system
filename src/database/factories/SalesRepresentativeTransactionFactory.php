<?php

namespace Database\Factories;

use App\Models\SalesRepresentativeTransaction;
use App\Models\SalesRepresentative;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesRepresentativeTransactionFactory extends Factory
{
    protected $model = SalesRepresentativeTransaction::class;

    public function definition(): array
    {
        return [
            'sales_representative_id' => SalesRepresentative::factory(),
            'type' => $this->faker->randomElement(['commission', 'payment', 'return', 'adjustment']),
            'amount' => $this->faker->randomFloat(2, 10, 1000),
            'description' => $this->faker->sentence(),
            'transaction_date' => now(),
            'created_by' => 1,
            'is_deleted' => false,
        ];
    }
}
