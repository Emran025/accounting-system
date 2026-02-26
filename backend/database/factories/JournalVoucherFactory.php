<?php

namespace Database\Factories;

use App\Models\JournalVoucher;
use App\Models\ChartOfAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JournalVoucherFactory extends Factory
{
    protected $model = JournalVoucher::class;

    public function definition()
    {
        return [
            'voucher_number' => 'JV-' . $this->faker->unique()->numberBetween(1000, 9999),
            'voucher_date' => now(),
            'account_id' => ChartOfAccount::factory(), // This might create too many accounts if not careful, better to pass existing id
            'entry_type' => $this->faker->randomElement(['DEBIT', 'CREDIT']),
            'amount' => $this->faker->randomFloat(2, 10, 1000),
            'description' => $this->faker->sentence,
            'created_by' => User::factory(),
        ];
    }
}
