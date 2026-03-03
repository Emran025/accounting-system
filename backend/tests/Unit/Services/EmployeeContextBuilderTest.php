<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\Department;
use App\Services\EmployeeContextBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class EmployeeContextBuilderTest extends TestCase
{
    use RefreshDatabase;

    private EmployeeContextBuilder $builder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->builder = new EmployeeContextBuilder();
    }

    public function test_builds_context_for_employee()
    {
        $department = Department::factory()->create(['name_en' => 'Engineering']);
        $employee = Employee::factory()->create([
            'department_id' => $department->id,
            'full_name' => 'Ahmed Al-Rashid',
            'base_salary' => 15000,
        ]);

        $context = $this->builder->build($employee);

        $this->assertIsArray($context);
        $this->assertEquals('Ahmed Al-Rashid', $context['employee_name']);
        $this->assertEquals('15,000.00', $context['base_salary']);
    }

    public function test_context_includes_employee_info()
    {
        $department = Department::factory()->create();
        $employee = Employee::factory()->create([
            'department_id' => $department->id,
            'full_name' => 'Sara Hassan',
        ]);

        $context = $this->builder->build($employee);

        $this->assertEquals('Sara Hassan', $context['employee_name']);
    }

    public function test_context_includes_department_info()
    {
        $department = Department::factory()->create([
            'name_ar' => 'المبيعات',
            'name_en' => 'Sales'
        ]);
        $employee = Employee::factory()->create([
            'department_id' => $department->id,
        ]);

        $context = $this->builder->build($employee);

        $this->assertEquals('المبيعات', $context['department']);
        $this->assertEquals('Sales', $context['department_en']);
    }

    public function test_context_applies_overrides()
    {
        $employee = Employee::factory()->create();
        $custom = ['custom_field' => 'Value', 'employee_name' => 'Overridden Name'];

        $context = $this->builder->build($employee, $custom);

        $this->assertEquals('Overridden Name', $context['employee_name']);
        $this->assertEquals('Value', $context['custom_field']);
    }
}
