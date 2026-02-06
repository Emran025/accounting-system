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
            'employee_code' => 'EMP-' . fake()->unique()->numerify('####'),
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password123',
            'phone' => fake()->phoneNumber(),
            'hire_date' => fake()->dateTimeBetween('-5 years', 'now'),
            'department_id' => Department::factory(),
            'employment_status' => 'active',
            'contract_type' => 'full_time',
            'base_salary' => fake()->randomFloat(2, 3000, 25000),
            'is_active' => true,
            'national_id' => fake()->numerify('##########'),
            'bank_name' => fake()->randomElement(['Al Rajhi Bank', 'Saudi National Bank', 'Riyad Bank']),
            'iban' => fake()->iban('SA'),
            'address' => fake()->address(),
        ];
    }

    /**
     * Create an active employee
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'employment_status' => 'active',
            'is_active' => true,
        ]);
    }

    /**
     * Create a suspended employee
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'employment_status' => 'suspended',
            'is_active' => false,
        ]);
    }

    /**
     * Create a terminated employee
     */
    public function terminated(): static
    {
        return $this->state(fn (array $attributes) => [
            'employment_status' => 'terminated',
            'is_active' => false,
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
