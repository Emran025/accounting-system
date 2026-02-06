<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Configure the model factory.
     */
    public function configure()
    {
        return $this->afterCreating(function (Product $product) {
            if ($product->stock_quantity > 0) {
                \Illuminate\Support\Facades\DB::table('inventory_costing')->insert([
                    'product_id' => $product->id,
                    'reference_type' => 'initial_stock',
                    'reference_id' => $product->id,
                    'quantity' => $product->stock_quantity,
                    'consumed_quantity' => 0,
                    'unit_cost' => $product->weighted_average_cost ?? 0,
                    'total_cost' => $product->stock_quantity * ($product->weighted_average_cost ?? 0),
                    'is_sold' => false,
                    'costing_method' => 'FIFO',
                    'transaction_date' => now(),
                    'created_at' => now(),
                ]);
            }
        });
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->optional()->sentence(),
            'category_id' => Category::factory(),
            'unit_price' => fake()->randomFloat(2, 10, 1000),
            'minimum_profit_margin' => fake()->randomFloat(2, 5, 30),
            'stock_quantity' => fake()->numberBetween(0, 500),
            'unit_name' => fake()->randomElement(['piece', 'box', 'carton', 'kg', 'liter']),
            'items_per_unit' => fake()->numberBetween(1, 24),
            'sub_unit_name' => fake()->optional()->randomElement(['piece', 'item', 'unit']),
            'weighted_average_cost' => fake()->randomFloat(2, 5, 500),
            'created_by' => null,
            'purchase_currency_id' => null,
        ];
    }

    /**
     * Create a product with zero stock
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock_quantity' => 0,
        ]);
    }

    /**
     * Create a product with low stock
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock_quantity' => fake()->numberBetween(1, 10),
        ]);
    }

    /**
     * Create a product with specific category
     */
    public function inCategory(Category $category): static
    {
        return $this->state(fn (array $attributes) => [
            'category_id' => $category->id,
        ]);
    }

    /**
     * Create a product with creator
     */
    public function createdBy(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'created_by' => $user->id,
        ]);
    }
}
