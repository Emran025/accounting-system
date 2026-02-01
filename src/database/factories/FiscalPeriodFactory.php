<?php

namespace Database\Factories;

use App\Models\FiscalPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\FiscalPeriod>
 */
class FiscalPeriodFactory extends Factory
{
    protected $model = FiscalPeriod::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = Carbon::now()->startOfMonth();
        $endDate = Carbon::now()->endOfMonth();
        
        return [
            'period_name' => $startDate->format('F Y'),
            'start_date' => $startDate,
            'end_date' => $endDate,
            'is_closed' => false,
            'is_locked' => false,
        ];
    }

    /**
     * Create an open period
     */
    public function open(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_closed' => false,
            'is_locked' => false,
        ]);
    }

    /**
     * Create a closed period
     */
    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_closed' => true,
            'is_locked' => true,
        ]);
    }

    /**
     * Create a period for a specific month
     */
    public function forMonth(int $month, int $year): static
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();
        
        return $this->state(fn (array $attributes) => [
            'period_name' => $startDate->format('F Y'),
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    /**
     * Create a locked period
     */
    public function locked(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_locked' => true,
        ]);
    }
}
