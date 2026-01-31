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
            'name' => $this->faker->word,
            'module_key' => $this->faker->unique()->slug,
            'is_active' => true,
        ];
    }
}
