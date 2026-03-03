<?php

namespace Database\Factories;

use App\Models\CompensationPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompensationPlanFactory extends Factory
{
    protected $model = CompensationPlan::class;

    public function definition()
    {
        return [
            'plan_name' => $this->faker->words(3, true),
            'plan_type' => $this->faker->randomElement(['merit', 'promotion', 'adjustment', 'bonus', 'commission']),
            'fiscal_year' => $this->faker->year(),
            'effective_date' => $this->faker->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'status' => $this->faker->randomElement(['draft', 'pending_approval', 'approved', 'active', 'closed']),
            'budget_pool' => $this->faker->randomFloat(2, 10000, 100000),
            'allocated_amount' => $this->faker->randomFloat(2, 0, 10000),
            'notes' => $this->faker->sentence(),
            'created_by' => User::factory(),
        ];
    }
}
