<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\Department;
use App\Services\EOSBCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class EOSBCalculatorServiceTest extends TestCase
{
    use RefreshDatabase;

    private EOSBCalculatorService $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new EOSBCalculatorService();
    }

    private function createEmployee(array $overrides = []): Employee
    {
        $department = Department::factory()->create();
        return Employee::factory()->create(array_merge([
            'department_id' => $department->id,
            'base_salary' => 10000,
            'hire_date' => Carbon::now()->subYears(5)->toDateString(),
        ], $overrides));
    }

    public function test_calculates_eosb_for_five_years()
    {
        $employee = $this->createEmployee([
            'hire_date' => Carbon::now()->subYears(5)->toDateString(),
        ]);

        $result = $this->calculator->calculate($employee, Carbon::now()->toDateString(), 'end_of_contract');

        $this->assertArrayHasKey('eosb_amount', $result);
        $this->assertGreaterThan(0, $result['eosb_amount']);
    }

    public function test_calculates_eosb_for_less_than_two_years()
    {
        $employee = $this->createEmployee([
            'hire_date' => Carbon::now()->subYear()->toDateString(),
        ]);

        $result = $this->calculator->calculate($employee, Carbon::now()->toDateString(), 'resignation');

        $this->assertArrayHasKey('eosb_amount', $result);
        $this->assertEquals(0, $result['eosb_amount']);
    }

    public function test_calculates_eosb_for_more_than_five_years()
    {
        $employee = $this->createEmployee([
            'hire_date' => Carbon::now()->subYears(10)->toDateString(),
        ]);

        $result = $this->calculator->calculate($employee, Carbon::now()->toDateString(), 'end_of_contract');

        $this->assertArrayHasKey('eosb_amount', $result);
        $this->assertGreaterThan(0, $result['eosb_amount']);
    }

    public function test_eosb_includes_years_of_service()
    {
        $employee = $this->createEmployee([
            'hire_date' => Carbon::now()->subYears(7)->toDateString(),
        ]);

        $result = $this->calculator->calculate($employee, Carbon::now()->toDateString(), 'end_of_contract');

        $this->assertArrayHasKey('years_of_service', $result);
        $this->assertGreaterThanOrEqual(7, $result['years_of_service']);
    }

    public function test_resignation_type_affects_calculation()
    {
        $employee = $this->createEmployee([
            'hire_date' => Carbon::now()->subYears(8)->toDateString(),
        ]);

        $resignResult = $this->calculator->calculate($employee, Carbon::now()->toDateString(), 'resignation');
        $terminationResult = $this->calculator->calculate($employee, Carbon::now()->toDateString(), 'termination');

        // Resignation typically yields less than termination
        $this->assertLessThanOrEqual(
            $terminationResult['eosb_amount'],
            $resignResult['eosb_amount']
        );
    }
}
