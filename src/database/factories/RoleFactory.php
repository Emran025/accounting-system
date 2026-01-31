<?php

namespace Database\Factories;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Role>
 */
class RoleFactory extends Factory
{
    protected $model = Role::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'role_name' => fake()->jobTitle(),
            'role_key' => fake()->unique()->slug(2),
            'is_active' => true,
        ];
    }

    /**
     * Create an admin role
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_name' => 'Administrator',
            'role_key' => 'admin',
        ]);
    }

    /**
     * Create a cashier role
     */
    public function cashier(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_name' => 'Cashier',
            'role_key' => 'cashier',
        ]);
    }

    /**
     * Create an accountant role
     */
    public function accountant(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_name' => 'Accountant',
            'role_key' => 'accountant',
        ]);
    }

    /**
     * Create an inactive role
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
