<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LeaveApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_leave_requests()
    {
        LeaveRequest::factory()->count(3)->create();

        $response = $this->authGet(route('api.leave_requests.index'));

        $this->assertStatusResolved($response, 200);
        $response->assertJsonStructure([
            'data',
            'current_page',
            'per_page',
            'total'
        ]);
        $this->assertCount(3, $response->json('data'));
    }

    public function test_can_create_leave_request()
    {
        $employee = Employee::factory()->create([
            'vacation_days_balance' => 30
        ]);

        $data = [
            'employee_id' => $employee->id,
            'leave_type' => 'vacation',
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'reason' => 'Annual vacation'
        ];

        $response = $this->authPost(route('api.leave_requests.store'), $data);

        $this->assertStatusResolved($response, 201);
        $this->assertDatabaseHas('leave_requests', [
            'employee_id' => $employee->id,
            'leave_type' => 'vacation'
        ]);
    }

    public function test_can_approve_leave_request()
    {
        $leaveRequest = LeaveRequest::factory()->create([
            'status' => 'pending'
        ]);

        $data = [
            'action' => 'approved'
        ];

        $response = $this->authPost(route('api.leave_requests.approve', $leaveRequest->id), $data);

        $this->assertStatusResolved($response, 200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'status' => 'approved'
        ]);
    }

    public function test_can_cancel_leave_request()
    {
        $leaveRequest = LeaveRequest::factory()->create([
            'status' => 'pending'
        ]);

        $response = $this->authPost(route('api.leave_requests.cancel', $leaveRequest->id));

        $this->assertStatusResolved($response, 200);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'status' => 'cancelled'
        ]);
    }

    public function test_can_view_leave_request_details()
    {
        $leaveRequest = LeaveRequest::factory()->create();

        $response = $this->authGet(route('api.leave_requests.show', $leaveRequest->id));

        $this->assertStatusResolved($response, 200);
        $response->assertJsonFragment([
            'id' => $leaveRequest->id
        ]);
    }

    public function test_employee_can_view_own_leave_requests()
    {
        $role = \App\Models\Role::where('role_key', 'employee')->first();
        $user = User::factory()->create(['role_id' => $role->id]);
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        
        LeaveRequest::factory()->create([
            'employee_id' => $employee->id
        ]);

        $this->authenticateUser($user);

        $response = $this->authGet(route('api.employee_portal.leave_requests'));

        $this->assertStatusResolved($response, 200);
        $response->assertJsonStructure([
            'data',
            'current_page',
            'total'
        ]);
        $this->assertCount(1, $response->json('data'));
    }
}
