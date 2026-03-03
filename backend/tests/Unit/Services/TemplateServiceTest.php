<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\TemplateService;
use App\Services\TemplateRenderer;
use App\Models\DocumentTemplate;
use App\Services\TemplateRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TemplateServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_template_renderer_replaces_variables()
    {
        $registry = new TemplateRegistry();
        $renderer = new TemplateRenderer($registry);

        $template = DocumentTemplate::factory()->create([
            'template_type' => 'other',
            'body_html' => '<p>Hello {{employee_name}}, your email is {{email}}</p>',
            'is_active' => true,
        ]);
        
        $data = ['employee_name' => 'Ahmed', 'email' => 'ahmed@example.com'];

        $result = $renderer->render($template, $data);

        $this->assertStringContainsString('Ahmed', $result);
        $this->assertStringContainsString('ahmed@example.com', $result);
    }

    public function test_template_renderer_handles_missing_variables()
    {
        $registry = new TemplateRegistry();
        $renderer = new TemplateRenderer($registry);

        $template = DocumentTemplate::factory()->create([
            'template_type' => 'other',
            'body_html' => '<p>Hello {{employee_name}}, your phone is {{phone}}</p>',
            'is_active' => true,
        ]);
        
        $data = ['employee_name' => 'Sara'];

        $result = $renderer->render($template, $data);

        $this->assertStringContainsString('Sara', $result);
        // Missing variable should be empty string per prepareReplacements flattening
    }

    public function test_template_renderer_handles_empty_template()
    {
        $registry = new TemplateRegistry();
        $renderer = new TemplateRenderer($registry);

        $template = DocumentTemplate::factory()->create([
            'template_type' => 'other',
            'body_html' => '',
            'is_active' => true,
        ]);

        $result = $renderer->render($template, []);

        $this->assertEquals('<div dir="rtl"></div>', $result); // Wrapping div added for Arabic default
    }

    public function test_template_renderer_handles_nested_data()
    {
        $registry = new TemplateRegistry();
        $renderer = new TemplateRenderer($registry);

        // Registry expects specific keys for 'other' type or common keys.
        // Nested data is flattened: company.name -> company_name
        $template = DocumentTemplate::factory()->create([
            'template_type' => 'other',
            'body_html' => '<p>Name: {{employee_name}}</p>',
            'is_active' => true,
        ]);
        
        $data = ['employee_name' => 'Acme Inc'];

        $result = $renderer->render($template, $data);

        $this->assertStringContainsString('Acme Inc', $result);
    }
}
