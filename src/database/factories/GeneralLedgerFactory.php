<?php

namespace Database\Factories;

use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class GeneralLedgerFactory extends Factory
{
    protected $model = GeneralLedger::class;

    public function definition()
    {
        return [
            'account_id' => ChartOfAccount::factory(),
            'voucher_number' => 'V-' . $this->faker->unique()->numberBetween(1000, 9999),
            'voucher_date' => now(),
            'entry_type' => $this->faker->randomElement(['DEBIT', 'CREDIT']),
            'amount' => $this->faker->randomFloat(2, 10, 1000),
            'description' => $this->faker->sentence,
            'created_by' => User::factory(),
            'is_closed' => false,
        ];
    }

    public function createWithDates(array $attributes, $date)
    {
        return $this->create(array_merge($attributes, [
            'voucher_date' => $date,
            'created_at' => $date,
            'updated_at' => $date,
        ]));
    }
}
