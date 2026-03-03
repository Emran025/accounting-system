<?php

namespace Database\Factories;

use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Models\User;
use App\Models\UniversalJournal;
use Illuminate\Database\Eloquent\Factories\Factory;

class GeneralLedgerFactory extends Factory
{
    protected $model = GeneralLedger::class;

    public function definition()
    {
        return [
            'account_id' => ChartOfAccount::factory(),
            'voucher_number' => function () {
                return 'V-' . $this->faker->unique()->numerify('#####');
            },
            'voucher_date' => now()->toDateString(),
            'entry_type' => $this->faker->randomElement(['DEBIT', 'CREDIT']),
            'amount' => $this->faker->randomFloat(2, 10, 1000),
            'description' => $this->faker->sentence,
            'created_by' => User::factory(),
            'is_closed' => false,
        ];
    }

    public function configure()
    {
        return $this->afterMaking(function (GeneralLedger $gl) {
            if ($gl->voucher_number && !UniversalJournal::where('voucher_number', $gl->voucher_number)->exists()) {
                UniversalJournal::factory()->create([
                    'voucher_number' => $gl->voucher_number
                ]);
            }
        });
    }

    public function createWithDates(array $attributes, $date)
    {
        return $this->create(array_merge($attributes, [
            'voucher_date' => $date,
            'created_at' => $date,
        ]));
    }
}
