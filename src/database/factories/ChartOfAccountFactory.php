<?php

namespace Database\Factories;

use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ChartOfAccount>
 */
class ChartOfAccountFactory extends Factory
{
    protected $model = ChartOfAccount::class;

    private static int $accountCodeCounter = 1000;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'account_code' => (string) self::$accountCodeCounter++,
            'account_name' => fake()->words(3, true),
            'account_type' => fake()->randomElement(['asset', 'liability', 'equity', 'revenue', 'expense']),
            'parent_id' => null,
            'is_active' => true,
            'description' => fake()->optional()->sentence(),
        ];
    }

    /**
     * Create an asset account
     */
    public function asset(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => 'asset',
            'account_code' => '1' . str_pad(self::$accountCodeCounter++, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Create a liability account
     */
    public function liability(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => 'liability',
            'account_code' => '2' . str_pad(self::$accountCodeCounter++, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Create an equity account
     */
    public function equity(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => 'equity',
            'account_code' => '3' . str_pad(self::$accountCodeCounter++, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Create a revenue account
     */
    public function revenue(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => 'revenue',
            'account_code' => '4' . str_pad(self::$accountCodeCounter++, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Create an expense account
     */
    public function expense(): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => 'expense',
            'account_code' => '5' . str_pad(self::$accountCodeCounter++, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Create a child account under a parent
     */
    public function childOf(ChartOfAccount $parent): static
    {
        return $this->state(fn (array $attributes) => [
            'parent_id' => $parent->id,
            'account_type' => $parent->account_type,
        ]);
    }

    /**
     * Create an inactive account
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
