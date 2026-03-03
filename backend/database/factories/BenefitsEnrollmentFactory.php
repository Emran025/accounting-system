<?php

namespace Database\Factories;

use App\Models\BenefitsEnrollment;
use App\Models\BenefitsPlan;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class BenefitsEnrollmentFactory extends Factory
{
    protected $model = BenefitsEnrollment::class;

    public function definition()
    {
        return [
            'plan_id' => BenefitsPlan::factory(),
            'employee_id' => Employee::factory(),
            'enrollment_type' => $this->faker->randomElement(['open_enrollment', 'new_hire', 'life_event']),
            'enrollment_date' => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'effective_date' => $this->faker->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'status' => $this->faker->randomElement(['enrolled', 'active', 'terminated', 'cancelled']),
            'coverage_details' => [],
            'notes' => $this->faker->sentence(),
        ];
    }
}
