<?php

namespace Database\Factories;

use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

class ModuleFactory extends Factory
{
    protected $model = Module::class;

    public function definition()
    {
        return [
            'module_key' => $this->faker->unique()->slug,
            'module_name_en' => $this->faker->words(2, true),
            'module_name_ar' => 'وحدة ' . $this->faker->word,
            'category' => $this->faker->randomElement(['core', 'sales', 'hr', 'finance']),
            'is_active' => true,
        ];
    }
}
