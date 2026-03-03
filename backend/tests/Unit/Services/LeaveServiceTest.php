<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\Department;
use App\Services\LeaveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class LeaveServiceTest extends TestCase
{
    use RefreshDatabase;

    private LeaveService $leaveService;
    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->leaveService = new LeaveService();

        $department = Department::factory()->create();
        $this->employee = Employee::factory()->create([
            'department_id' => $department->id,
            'vacation_days_balance' => 30,
        ]);
    }

    public function test_can_create_leave_request()
    {
        $data = [
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDays(5)->toDateString(),
            'end_date' => Carbon::now()->addDays(9)->toDateString(),
            'reason' => 'Family trip',
        ];

        $result = $this->leaveService->createLeaveRequest($this->employee->id, $data);

        $this->assertInstanceOf(LeaveRequest::class, $result);
        $this->assertEquals('pending', $result->status);
        $this->assertEquals($this->employee->id, $result->employee_id);
    }

    public function test_create_leave_fails_for_insufficient_balance()
    {
        $this->employee->update(['vacation_days_balance' => 1]);

        $data = [
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDay()->toDateString(),
            'end_date' => Carbon::now()->addDays(10)->toDateString(),
            'reason' => 'Long vacation',
        ];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Insufficient vacation days balance');

        $this->leaveService->createLeaveRequest($this->employee->id, $data);
    }

    public function test_create_leave_fails_for_overlapping_dates()
    {
        // Create existing leave request
        LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDays(5),
            'end_date' => Carbon::now()->addDays(10),
            'days_requested' => 4,
            'status' => 'pending',
        ]);

        // Try to create overlapping request
        $data = [
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDays(7)->toDateString(),
            'end_date' => Carbon::now()->addDays(12)->toDateString(),
            'reason' => 'Overlap',
        ];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('overlaps');

        $this->leaveService->createLeaveRequest($this->employee->id, $data);
    }

    public function test_can_approve_leave_request()
    {
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDays(5),
            'end_date' => Carbon::now()->addDays(7),
            'days_requested' => 2,
            'status' => 'pending',
        ]);

        $initialBalance = $this->employee->vacation_days_balance;

        $result = $this->leaveService->processLeaveRequest(
            $leaveRequest->id,
            'approved',
            $this->authenticatedUser->id ?? 1
        );

        $this->assertEquals('approved', $result->status);
        $this->assertEquals(
            $initialBalance - 2,
            $this->employee->fresh()->vacation_days_balance
        );
    }

    public function test_can_reject_leave_request()
    {
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDays(5),
            'end_date' => Carbon::now()->addDays(7),
            'days_requested' => 2,
            'status' => 'pending',
        ]);

        $result = $this->leaveService->processLeaveRequest(
            $leaveRequest->id,
            'rejected',
            1,
            'Not enough coverage'
        );

        $this->assertEquals('rejected', $result->status);
        $this->assertEquals('Not enough coverage', $result->rejection_reason);
    }

    public function test_cannot_process_already_processed_request()
    {
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'vacation',
            'start_date' => Carbon::now()->addDays(5),
            'end_date' => Carbon::now()->addDays(7),
            'days_requested' => 2,
            'status' => 'approved',
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('already been processed');

        $this->leaveService->processLeaveRequest($leaveRequest->id, 'rejected', 1);
    }

    public function test_has_pending_leave_requests()
    {
        LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'vacation',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-10',
            'days_requested' => 7,
            'status' => 'pending',
        ]);

        $result = $this->leaveService->hasPendingLeaveRequests(
            $this->employee->id,
            '2026-03-01',
            '2026-03-31'
        );

        $this->assertTrue($result);
    }

    public function test_no_pending_leave_requests_outside_period()
    {
        LeaveRequest::create([
            'employee_id' => $this->employee->id,
            'leave_type' => 'vacation',
            'start_date' => '2026-01-01',
            'end_date' => '2026-01-05',
            'days_requested' => 4,
            'status' => 'pending',
        ]);

        $result = $this->leaveService->hasPendingLeaveRequests(
            $this->employee->id,
            '2026-06-01',
            '2026-06-30'
        );

        $this->assertFalse($result);
    }
}
