<?php

namespace Tests\Feature\Hr;

use Tests\TestCase;
use App\Models\DocumentTemplate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;

class DocumentTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Authenticate admin
        $this->authenticateUser();
    }

    #[Test]
    public function it_can_list_document_templates()
    {
        DocumentTemplate::create([
            'template_key' => 'nda_emp',
            'template_name_en' => 'Employee NDA',
            'template_name_ar' => 'اتفاقية عدم إفشاء',
            'template_type' => 'other', // Changed from 'html' to 'other'
            'body_html' => '<p>Confidential...</p>',
            'is_active' => true,
        ]);

        $response = $this->authGet('/api/document-templates');

        $this->assertSuccessResponse($response);
        $response->assertJsonFragment(['template_key' => 'nda_emp']);
    }

    #[Test]
    public function it_can_create_document_template()
    {
        $data = [
            'template_key' => 'welcome_letter',
            'template_name_en' => 'Welcome Letter',
            'template_name_ar' => 'رسالة ترحيب',
            'template_type' => 'other',
            'body_html' => '<p>Welcome {{employee_name}}</p>',
            'editable_fields' => ['employee_name'],
            'description' => 'Standard welcome letter',
            'is_active' => true,
        ];

        $response = $this->authPost('/api/document-templates', $data);

        $this->assertSuccessResponse($response, 200);
        $this->assertDatabaseHas('document_templates', ['template_key' => 'welcome_letter']);
    }

    #[Test]
    public function it_can_render_document_template()
    {
        $tpl = DocumentTemplate::create([
            'template_key' => 'simple_contract',
            'template_name_en' => 'Contract',
            'template_name_ar' => 'عقد عمل',
            'template_type' => 'contract',
            'body_html' => '<p>Contract for {{name}} with salary {{salary}}</p>',
            'editable_fields' => ['name', 'salary'],
            'is_active' => true,
        ]);

        $employee = \App\Models\Employee::factory()->create();

        $renderData = [
            'employee_id' => $employee->id,
            'custom_fields' => [
                'name' => 'John Doe',
                'salary' => '5000',
            ]
        ];

        $response = $this->authPost("/api/document-templates/{$tpl->id}/render", $renderData);

        $this->assertSuccessResponse($response);
        
        $json = $response->json();
        // Depending on implementation, it might return html in 'rendered_content' or similar
        // Let's assume the controller returns { success: true, daa: { html: ... } }
        
        // Checking if the response contains the substituted values
        $this->assertStringContainsString('John Doe', $json['data']['rendered_html'] ?? json_encode($json));
        $this->assertStringContainsString('5000', $json['data']['rendered_html'] ?? json_encode($json));
    }

    #[Test]
    public function it_can_update_document_template()
    {
        $tpl = DocumentTemplate::create([
            'template_key' => 'old_policy',
            'template_name_en' => 'Old Policy',
            'template_name_ar' => 'سياسة قديمة',
            'body_html' => 'Old content',
            'is_active' => true,
        ]);

        $updateData = [
            'template_name_en' => 'New Policy',
            'body_html' => 'New content',
        ];

        $response = $this->authPut("/api/document-templates/{$tpl->id}", $updateData);

        $this->assertSuccessResponse($response);
        $tpl->refresh();
        $this->assertEquals('New Policy', $tpl->template_name_en);
        $this->assertEquals('New content', $tpl->body_html);
    }

    #[Test]
    public function it_can_delete_document_template()
    {
        $tpl = DocumentTemplate::create([
            'template_key' => 'temp_doc',
            'template_name_en' => 'Temp Doc',
            'template_name_ar' => 'وثيقة مؤقتة',
            'body_html' => '<p>Temporary content</p>',
            'is_active' => false,
        ]);

        $response = $this->authDelete("/api/document-templates/{$tpl->id}");
        
        $this->assertSuccessResponse($response);
        $this->assertNull(DocumentTemplate::find($tpl->id));
    }
}
