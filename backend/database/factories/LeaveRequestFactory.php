<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class LeaveRequestFactory extends Factory
{
    protected $model = LeaveRequest::class;

    public function definition()
    {
        return [
            'employee_id' => Employee::factory(),
            'leave_type' => $this->faker->randomElement(['vacation', 'sick', 'emergency', 'unpaid', 'other']),
            'start_date' => $this->faker->dateTimeBetween('now', '+1 month')->format('Y-m-d'),
            'end_date' => $this->faker->dateTimeBetween('+1 month', '+2 months')->format('Y-m-d'),
            'days_requested' => $this->faker->numberBetween(1, 10),
            'reason' => $this->faker->sentence(),
            'status' => $this->faker->randomElement(['pending', 'approved', 'rejected', 'cancelled']),
            'created_by' => User::factory(),
        ];
    }
}
