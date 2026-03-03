<?php

namespace Database\Factories;

use App\Models\BenefitsPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BenefitsPlanFactory extends Factory
{
    protected $model = BenefitsPlan::class;

    public function definition()
    {
        return [
            'plan_code' => $this->faker->unique()->lexify('PLAN-????'),
            'plan_name' => $this->faker->words(3, true),
            'plan_type' => $this->faker->randomElement(['health', 'dental', 'vision', 'life_insurance', 'disability']),
            'description' => $this->faker->sentence(),
            'eligibility_rule' => 'all',
            'eligibility_criteria' => [],
            'employee_contribution' => $this->faker->randomFloat(2, 50, 200),
            'employer_contribution' => $this->faker->randomFloat(2, 200, 1000),
            'effective_date' => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
