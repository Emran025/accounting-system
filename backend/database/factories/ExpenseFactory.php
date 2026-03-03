<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\User;
use App\Models\UniversalJournal;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'category' => $this->faker->randomElement(['rent', 'utilities', 'supplies', 'maintenance']),
            'account_code' => '5100',
            'voucher_number' => UniversalJournal::factory()->create()->voucher_number,
            'expense_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'description' => $this->faker->sentence(),
            'payment_type' => $this->faker->randomElement(['cash', 'credit']),
            'user_id' => User::factory(),
        ];
    }
}
