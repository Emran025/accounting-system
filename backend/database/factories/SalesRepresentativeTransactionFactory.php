<?php

namespace Database\Factories;

use App\Models\SalesRepresentativeTransaction;
use App\Models\SalesRepresentative;
use App\Models\UniversalJournal;

use Illuminate\Database\Eloquent\Factories\Factory;

class SalesRepresentativeTransactionFactory extends Factory
{
    protected $model = SalesRepresentativeTransaction::class;

    public function definition(): array
    {
        return [
            'sales_representative_id' => SalesRepresentative::factory(),
            'type' => $this->faker->randomElement(['commission', 'payment', 'return', 'adjustment']),
            'voucher_number' => function () {
                return UniversalJournal::factory()->create(['voucher_number' => 'SRT-' . fake()->unique()->numerify('#####')])->voucher_number;
            },
            'description' => $this->faker->sentence(),
            'transaction_date' => now(),
            'created_by' => 1,
            'is_deleted' => false,
        ];
    }
}
