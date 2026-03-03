<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_attendance()
    {
        $employee = Employee::factory()->create();

        $response = $this->authGet(route('api.attendance.index', [
            'employee_id' => $employee->id,
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->endOfMonth()->toDateString(),
        ]));

        $this->assertStatusResolved($response, 200);
        $response->assertJsonIsArray();
    }

    public function test_can_record_attendance()
    {
        $employee = Employee::factory()->create();

        $data = [
            'employee_id' => $employee->id,
            'attendance_date' => now()->toDateString(),
            'check_in' => '09:00',
            'check_out' => '17:00',
            'status' => 'present',
            'notes' => 'On time',
            'source' => 'manual'
        ];

        $response = $this->authPost(route('api.attendance.store'), $data);

        $this->assertStatusResolved($response, 201);
        $this->assertDatabaseHas('attendance_records', [
            'employee_id' => $employee->id,
            'status' => 'present'
        ]);
    }

    public function test_can_bulk_import_attendance()
    {
        $employee1 = Employee::factory()->create();
        $employee2 = Employee::factory()->create();

        $data = [
            'records' => [
                [
                    'employee_id' => $employee1->id,
                    'date' => now()->toDateString(),
                    'check_in' => '09:00',
                    'check_out' => '18:00',
                    'status' => 'present'
                ],
                [
                    'employee_id' => $employee2->id,
                    'date' => now()->toDateString(),
                    'check_in' => '10:00',
                    'check_out' => '19:00',
                    'status' => 'present'
                ]
            ]
        ];

        $response = $this->authPost(route('api.attendance.bulk_import'), $data);

        $this->assertStatusResolved($response, 201);
        $this->assertDatabaseCount('attendance_records', 2);
    }

    public function test_can_get_attendance_summary()
    {
        $employee = Employee::factory()->create();

        $response = $this->authGet(route('api.attendance.summary', [
            'employee_id' => $employee->id,
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->endOfMonth()->toDateString(),
        ]));

        $this->assertStatusResolved($response, 200);
        $response->assertJsonStructure([
            'total_hours',
            'total_days_present',
            'total_days_absent',
            'total_late_minutes'
        ]);
    }

    public function test_employee_can_view_own_attendance()
    {
        $role = \App\Models\Role::where('role_key', 'employee')->first();
        $user = User::factory()->create(['role_id' => $role->id]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);

        // Re-authenticate as the specific user using TestCase method
        $this->authenticateUser($user);

        $response = $this->authGet(route('api.employee_portal.attendance'));

        $this->assertStatusResolved($response, 200);
        $response->assertJsonStructure([
            'records',
            'summary'
        ]);
    }
}
