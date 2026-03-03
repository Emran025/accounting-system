<?php

namespace Database\Factories;

use App\Models\CompensationEntry;
use App\Models\CompensationPlan;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompensationEntryFactory extends Factory
{
    protected $model = CompensationEntry::class;

    public function definition()
    {
        $currentSalary = $this->faker->randomFloat(2, 2000, 10000);
        $increaseAmount = $this->faker->randomFloat(2, 100, 1000);
        
        return [
            'compensation_plan_id' => CompensationPlan::factory(),
            'employee_id' => Employee::factory(),
            'current_salary' => $currentSalary,
            'proposed_salary' => $currentSalary + $increaseAmount,
            'increase_amount' => $increaseAmount,
            'increase_percentage' => round(($increaseAmount / $currentSalary) * 100, 2),
            'status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'justification' => $this->faker->sentence(),
        ];
    }
}
