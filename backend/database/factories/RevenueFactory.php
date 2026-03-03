<?php

namespace Database\Factories;

use App\Models\Revenue;
use App\Models\User;
use App\Models\UniversalJournal;
use Illuminate\Database\Eloquent\Factories\Factory;

class RevenueFactory extends Factory
{
    protected $model = Revenue::class;

    public function definition(): array
    {
        return [
            'source' => $this->faker->randomElement(['Consulting', 'Product Sales', 'Services', 'Licensing']),
            'voucher_number' => UniversalJournal::factory()->create()->voucher_number,
            'revenue_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'description' => $this->faker->sentence(),
            'user_id' => User::factory(),
        ];
    }
}
