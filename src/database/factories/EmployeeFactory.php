<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Employee>
 */
class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'employee_number' => 'EMP-' . fake()->unique()->numerify('####'),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'hire_date' => fake()->dateTimeBetween('-5 years', 'now'),
            'department_id' => Department::factory(),
            'position' => fake()->jobTitle(),
            'basic_salary' => fake()->randomFloat(2, 3000, 25000),
            'status' => 'active',
            'national_id' => fake()->numerify('##########'),
            'bank_name' => fake()->randomElement(['Al Rajhi Bank', 'Saudi National Bank', 'Riyad Bank']),
            'bank_account' => fake()->bankAccountNumber(),
            'address' => fake()->address(),
        ];
    }

    /**
     * Create an active employee
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    /**
     * Create a suspended employee
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'suspended',
        ]);
    }

    /**
     * Create a terminated employee
     */
    public function terminated(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'terminated',
            'termination_date' => fake()->dateTimeBetween('-1 year', 'now'),
        ]);
    }

    /**
     * Create an employee in specific department
     */
    public function inDepartment(Department $department): static
    {
        return $this->state(fn (array $attributes) => [
            'department_id' => $department->id,
        ]);
    }
}
