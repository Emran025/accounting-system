<?php

namespace Database\Factories;

use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Department>
 */
class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Sales', 'Marketing', 'IT', 'HR', 'Finance', 
                'Operations', 'Logistics', 'Customer Service',
                'Research', 'Development', 'Administration'
            ]) . ' ' . fake()->numberBetween(1, 99),
            'description' => fake()->optional()->sentence(),
        ];
    }
}
