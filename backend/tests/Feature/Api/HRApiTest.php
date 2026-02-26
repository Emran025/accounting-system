<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\Department;
use Illuminate\Foundation\Testing\RefreshDatabase;

class HRApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    // Departments Tests
    public function test_can_list_departments()
    {
        Department::factory()->count(3)->create();

        $response = $this->authGet(route('api.departments.index'));

        $this->assertSuccessResponse($response);
        $this->assertEquals(3, $response->json('total'));
    }

    public function test_can_create_department()
    {
        $response = $this->authPost(route('api.departments.store'), [
            'name_ar' => 'قسم التقنية',
            'name_en' => 'IT Department',
            'description' => 'Tech Support'
        ]);

        $this->assertSuccessResponse($response, 201);
        $this->assertDatabaseHas('departments', ['name_en' => 'IT Department']);
    }

    public function test_can_update_department()
    {
        $department = Department::factory()->create();

        $response = $this->authPut(route('api.departments.update', $department->id), [
            'name_en' => 'Updated Name',
            'name_ar' => 'اسم محدث',
            'description' => 'Updated Description'
        ]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('departments', ['name_en' => 'Updated Name']);
    }

    public function test_can_delete_department()
    {
        $department = Department::factory()->create();

        $response = $this->authDelete(route('api.departments.destroy', $department->id));

        $this->assertSuccessResponse($response, 200);

        $this->assertDatabaseMissing('departments', ['id' => $department->id]);
    }

    // Employees Tests
    public function test_can_list_employees()
    {
        Employee::factory()->count(3)->create();

        $response = $this->authGet(route('api.employees.index'));

        $this->assertSuccessResponse($response);
        $this->assertEquals(3, $response->json('total'));
    }

    public function test_can_create_employee()
    {
        $department = Department::factory()->create();
        
        $data = [
            'full_name' => 'John Doe',
            'email' => 'john@example.com',
            'employee_code' => 'EMP001',
            'password' => 'password123',
            'phone' => '1234567890',
            'department_id' => $department->id,
            'position' => 'Developer',
            'base_salary' => 5000,
            'employment_status' => 'active',
            'hire_date' => now()->toDateString(),
        ];

        $response = $this->authPost(route('api.employees.store'), $data);

        $this->assertSuccessResponse($response, 201);
        $this->assertDatabaseHas('employees', ['email' => 'john@example.com']);
    }

    public function test_can_update_employee()
    {
        $employee = Employee::factory()->create();

        $data = [
            'full_name' => 'Jane Doe',
            'base_salary' => 6000,
        ];

        $response = $this->authPut(route('api.employees.update', $employee->id), $data);
        
        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('employees', ['full_name' => 'Jane Doe', 'base_salary' => 6000]);
    }
}
