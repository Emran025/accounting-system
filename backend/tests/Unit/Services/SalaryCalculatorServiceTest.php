<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\Department;
use App\Services\SalaryCalculatorService;
use App\Services\AttendanceService;
use App\Services\LeaveService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SalaryCalculatorServiceTest extends TestCase
{
    use RefreshDatabase;

    private SalaryCalculatorService $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->calculator = $this->app->make(SalaryCalculatorService::class);
    }

    private function createEmployee(array $overrides = []): Employee
    {
        $department = Department::factory()->create();
        return Employee::factory()->create(array_merge([
            'department_id' => $department->id,
            'base_salary' => 10000,
            'contract_type' => 'full_time',
        ], $overrides));
    }

    public function test_calculates_gross_salary()
    {
        $employee = $this->createEmployee();
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();

        $result = $this->calculator->calculate($employee, $start, $end);

        $this->assertArrayHasKey('gross_salary', $result);
        $this->assertGreaterThan(0, $result['gross_salary']);
    }

    public function test_calculates_net_salary()
    {
        $employee = $this->createEmployee();
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();

        $result = $this->calculator->calculate($employee, $start, $end);

        $this->assertArrayHasKey('net_salary', $result);
        $this->assertLessThanOrEqual($result['gross_salary'], $result['net_salary']);
    }

    public function test_includes_attendance_summary()
    {
        $employee = $this->createEmployee();
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();

        $result = $this->calculator->calculate($employee, $start, $end);

        $this->assertArrayHasKey('attendance_summary', $result);
    }

    public function test_includes_unpaid_leave_days()
    {
        $employee = $this->createEmployee();
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();

        $result = $this->calculator->calculate($employee, $start, $end);

        $this->assertArrayHasKey('unpaid_leave_days', $result);
    }

    public function test_handles_zero_salary()
    {
        $employee = $this->createEmployee([
            'base_salary' => 0,
        ]);
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();

        $result = $this->calculator->calculate($employee, $start, $end);

        $this->assertEquals(0, $result['gross_salary']);
        $this->assertEquals(0, $result['net_salary']);
    }
}
