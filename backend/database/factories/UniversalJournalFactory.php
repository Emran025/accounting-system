<?php

namespace Database\Factories;

use App\Models\UniversalJournal;
use Illuminate\Database\Eloquent\Factories\Factory;

class UniversalJournalFactory extends Factory
{
    protected $model = UniversalJournal::class;

    public function definition(): array
    {
        return [
            'voucher_number' => 'UJ-' . fake()->unique()->numerify('##########'),
            'document_type' => fake()->randomElement(['INVOICE', 'PAYMENT', 'PURCHASE', 'EXPENSE', 'REVENUE', 'JOURNAL']),
            'document_summary' => fake()->sentence(),
        ];
    }
}
