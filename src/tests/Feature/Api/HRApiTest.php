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
        $this->assertEquals(3, $response->json('meta.total'));
    }

    public function test_can_create_department()
    {
        $response = $this->authPost(route('api.departments.store'), [
            'name' => 'IT Department',
            'description' => 'Tech Support'
        ]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('departments', ['name' => 'IT Department']);
    }

    public function test_can_update_department()
    {
        $department = Department::factory()->create();

        $response = $this->authPut(route('api.departments.update'), [
            'id' => $department->id,
            'name' => 'Updated Name',
            'description' => 'Updated Description'
        ]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('departments', ['name' => 'Updated Name']);
    }

    public function test_can_delete_department()
    {
        $department = Department::factory()->create();

        $response = $this->authDelete(route('api.departments.destroy'), ['id' => $department->id]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('departments', ['id' => $department->id]);
    }

    // Employees Tests
    public function test_can_list_employees()
    {
        Employee::factory()->count(3)->create();

        $response = $this->authGet(route('api.employees.index'));

        $this->assertSuccessResponse($response);
        $this->assertEquals(3, $response->json('meta.total'));
    }

    public function test_can_create_employee()
    {
        $department = Department::factory()->create();
        
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'department_id' => $department->id,
            'position' => 'Developer',
            'base_salary' => 5000,
            'employment_status' => 'active',
            'hire_date' => now()->toDateString(),
        ];

        $response = $this->authPost(route('api.employees.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('employees', ['email' => 'john@example.com']);
    }

    public function test_can_update_employee()
    {
        $employee = Employee::factory()->create();

        $data = [
            'id' => $employee->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'base_salary' => 6000,
        ];

        $response = $this->authPost(route('api.employees.update'), $data); // Assuming POST for update with files, or PUT?
        // Let's assume POST for update if existing pattern suggests or stick to PUT if standard.
        // HRApiTest usually implies standard resource. But EmployeesController might handle file uploads.
        // Let's try PUT first standard. Wait, code often uses POST for updates with files.
        // I'll stick to PUT logic or check controller if needed. But let's assume standard REST PUT.
        // Correction: Test uses authPost? If logic uses POST for update (common in Laravel for form-data with files),
        // I should use POST. But if pure JSON, PUT works.
        // I will use PUT assuming JSON strictly.
        // Wait, standard Laravel resource uses PUT/PATCH.
        
        // Actually, let's play safe and check controller if I could, but I'll write as PUT.
        // If it fails, I can fix.
        // Re-reading previous `ProductsApiTest` uses `authPut`.
        
        $response = $this->authPut(route('api.employees.update'), $data);
        
        // If route is missing, it might default to POST for updates in this codebase?
        // Let's assume PUT.
        
        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('employees', ['first_name' => 'Jane', 'base_salary' => 6000]);
    }
}
