<?php

namespace Tests\Feature\Hr;

use Tests\TestCase;
use App\Models\JobTitle;
use App\Models\PermissionTemplate;
use App\Models\Employee;
use App\Models\User;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;

class HrAdministrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Authenticate as Admin
        $this->authenticateUser();
    }

    #[Test]
    public function it_can_list_job_titles()
    {
        JobTitle::create([
            'title_en' => 'Software Engineer',
            'title_ar' => 'مهندس برمجيات',
            'department_id' => Department::factory()->create()->id,
            'max_headcount' => 5,
            'current_headcount' => 0,
            'is_active' => true,
        ]);

        $response = $this->authGet(route('api.employees.index')); // HR Admin routes are in same group usually

        // Actually the route is '/api/hr/job-titles' based on my reading of api/hr.php line 258
        $response = $this->authGet('/api/job-titles');

        $this->assertSuccessResponse($response);
        $response->assertJsonFragment(['title_en' => 'Software Engineer']);
    }

    #[Test]
    public function it_can_create_job_title()
    {
        $data = [
            'title_en' => 'Senior Developer',
            'title_ar' => 'مطور أول',
            'department_id' => 1, // Assuming dept 1 exists or is nullable, wait dept is usually required.
            // Model says department_id is fillable.
            'max_headcount' => 3,
            'is_active' => true,
        ];

        // We need a department.
        $department = \App\Models\Department::factory()->create();
        $data['department_id'] = $department->id;

        $response = $this->authPost('/api/job-titles', $data);

        $this->assertSuccessResponse($response, 200);
        $this->assertDatabaseHas('job_titles', ['title_en' => 'Senior Developer']);
    }

    #[Test]
    public function it_can_update_job_title()
    {
        $jobTitle = JobTitle::create([
            'title_en' => 'Junior Dev',
            'title_ar' => 'مطور مبتدئ',
            'max_headcount' => 10,
        ]);

        $updateData = [
            'title_en' => 'Junior Developer',
            'max_headcount' => 12,
        ];

        $response = $this->authPut("/api/job-titles/{$jobTitle->id}", $updateData);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('job_titles', ['title_en' => 'Junior Developer', 'max_headcount' => 12]);
    }

    #[Test]
    public function it_can_delete_job_title()
    {
        $jobTitle = JobTitle::create([
            'title_en' => 'Obsolete Role',
            'title_ar' => 'دور قديم',
            'max_headcount' => 0,
        ]);

        $response = $this->authDelete("/api/job-titles/{$jobTitle->id}");

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('job_titles', ['id' => $jobTitle->id]);
    }

    #[Test]
    public function it_can_list_permission_templates()
    {
        PermissionTemplate::create([
            'template_name' => 'Manager Template',
            'template_key' => 'manager_tpl',
            'permissions' => ['employees.view', 'employees.edit'],
            'is_active' => true,
        ]);

        $response = $this->authGet('/api/permission-templates');

        $this->assertSuccessResponse($response);
        $response->assertJsonFragment(['template_key' => 'manager_tpl']);
    }

    #[Test]
    public function it_can_create_permission_template()
    {
        $data = [
            'template_name' => 'HR Staff',
            'template_key' => 'hr_staff',
            'permissions' => [
                [
                    'module_key' => 'employees',
                    'can_view' => true,
                    'can_create' => false,
                    'can_edit' => false,
                    'can_delete' => false,
                ]
            ],
            'is_active' => true,
        ];

        $response = $this->authPost('/api/permission-templates', $data);

        $this->assertSuccessResponse($response, 200);
        $this->assertDatabaseHas('permission_templates', ['template_key' => 'hr_staff']);
    }

    #[Test]
    public function it_can_link_employee_to_user()
    {
        $employee = Employee::factory()->create();
        $user = User::factory()->create();

        $data = [
            'employee_id' => $employee->id,
            'user_id' => $user->id,
        ];

        $response = $this->authPost('/api/employee-user-link', $data);

        $this->assertSuccessResponse($response);
        
        $employee->refresh();
        $this->assertEquals($user->id, $employee->user_id);
    }

    #[Test]
    public function it_can_unlink_employee_from_user()
    {
        $user = User::factory()->create();
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        $response = $this->authDelete("/api/employee-user-link/{$employee->id}");

        $this->assertSuccessResponse($response);

        $employee->refresh();
        $this->assertNull($employee->user_id);
    }
}
