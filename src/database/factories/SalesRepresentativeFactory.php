<?php

namespace Database\Factories;

use App\Models\SalesRepresentative;
use Illuminate\Database\Eloquent\Factories\Factory;

class SalesRepresentativeFactory extends Factory
{
    protected $model = SalesRepresentative::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'phone' => $this->faker->phoneNumber(),
            'email' => $this->faker->safeEmail(),
            'address' => $this->faker->address(),
            'current_balance' => 0,
            'created_by' => 1,
        ];
    }
}
