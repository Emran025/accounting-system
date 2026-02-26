<?php

namespace Database\Factories;

use App\Models\Reconciliation;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReconciliationFactory extends Factory
{
    protected $model = Reconciliation::class;

    public function definition()
    {
        return [
            'account_code' => '1110',
            'reconciliation_date' => now()->toDateString(),
            'physical_balance' => 1000.00,
            'ledger_balance' => 900.00,
            'difference' => 100.00,
            'status' => 'pending', // Assuming column exists
            'notes' => $this->faker->sentence,
        ];
    }
}
