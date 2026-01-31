<?php

namespace Database\Factories;

use App\Models\Telescope;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TelescopeFactory extends Factory
{
    protected $model = Telescope::class;

    public function definition()
    {
        return [
            'user_id' => User::factory(),
            'operation' => $this->faker->randomElement(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']),
            'table_name' => $this->faker->word,
            'record_id' => $this->faker->randomNumber(),
            'old_values' => null,
            'new_values' => ['field' => 'value'],
            'ip_address' => $this->faker->ipv4,
            'user_agent' => $this->faker->userAgent,
        ];
    }
}
