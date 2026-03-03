<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\DocumentTemplate;
use App\Models\User;

class DocumentTemplateFactory extends Factory
{
    protected $model = DocumentTemplate::class;

    public function definition(): array
    {
        return [
            'template_key' => $this->faker->unique()->word . '_template',
            'template_name_ar' => 'نموذج ' . $this->faker->word,
            'template_name_en' => 'Template ' . $this->faker->word,
            'template_type' => $this->faker->randomElement(['contract', 'letter', 'other']),
            'body_html' => '<p>' . $this->faker->paragraph . '</p>',
            'editable_fields' => [],
            'description' => $this->faker->sentence,
            'is_active' => true,
            'created_by' => User::factory(),
        ];
    }
}
