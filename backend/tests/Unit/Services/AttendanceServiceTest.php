<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Employee;
use App\Models\AttendanceRecord;
use App\Models\Department;
use App\Services\AttendanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class AttendanceServiceTest extends TestCase
{
    use RefreshDatabase;

    private AttendanceService $attendanceService;
    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();
        $this->attendanceService = new AttendanceService();

        $department = Department::factory()->create();
        $this->employee = Employee::factory()->create([
            'department_id' => $department->id,
            'contract_type' => 'full_time',
        ]);
    }

    public function test_can_record_attendance()
    {
        $date = Carbon::now()->toDateString();
        $data = [
            'check_in' => '09:00:00',
            'check_out' => '17:00:00',
            'status' => 'present',
            'source' => 'manual',
        ];

        $record = $this->attendanceService->recordAttendance($this->employee->id, $date, $data);

        $this->assertInstanceOf(AttendanceRecord::class, $record);
        $this->assertEquals('present', $record->status);
        $this->assertEquals($this->employee->id, $record->employee_id);
    }

    public function test_record_attendance_calculates_hours()
    {
        $date = Carbon::now()->toDateString();
        $data = [
            'check_in' => '08:00:00',
            'check_out' => '17:00:00',
            'status' => 'present',
        ];

        $record = $this->attendanceService->recordAttendance($this->employee->id, $date, $data);

        $this->assertNotNull($record->hours_worked);
        $this->assertGreaterThan(0, $record->hours_worked);
    }

    public function test_record_attendance_detects_late_arrival()
    {
        $date = Carbon::now()->toDateString();
        $data = [
            'check_in' => '09:30:00', // 30 minutes late (9 AM standard)
            'check_out' => '17:30:00',
            'status' => 'present',
        ];

        $record = $this->attendanceService->recordAttendance($this->employee->id, $date, $data);

        $this->assertTrue($record->is_late);
        $this->assertEquals(30, $record->late_minutes);
    }

    public function test_record_attendance_updates_existing_record()
    {
        $date = Carbon::now()->toDateString();

        // First record
        $this->attendanceService->recordAttendance($this->employee->id, $date, [
            'check_in' => '09:00:00',
            'status' => 'present',
        ]);

        // Update with check out
        $record = $this->attendanceService->recordAttendance($this->employee->id, $date, [
            'check_in' => '09:00:00',
            'check_out' => '17:00:00',
            'status' => 'present',
        ]);

        // Should not create a duplicate
        $this->assertEquals(
            1,
            AttendanceRecord::where('employee_id', $this->employee->id)
                ->where('attendance_date', $date)
                ->count()
        );
    }

    public function test_get_attendance_for_period()
    {
        // Create records for the period
        foreach (range(1, 3) as $day) {
            AttendanceRecord::create([
                'employee_id' => $this->employee->id,
                'attendance_date' => Carbon::now()->addDays($day)->toDateString(),
                'check_in' => '09:00:00',
                'check_out' => '17:00:00',
                'status' => 'present',
                'hours_worked' => 8,
            ]);
        }

        $records = $this->attendanceService->getAttendanceForPeriod(
            $this->employee->id,
            Carbon::now()->toDateString(),
            Carbon::now()->addDays(5)->toDateString()
        );

        $this->assertCount(3, $records);
    }

    public function test_calculate_total_hours()
    {
        // Create attendance records
        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => Carbon::now()->toDateString(),
            'check_in' => '09:00:00',
            'check_out' => '17:00:00',
            'status' => 'present',
            'hours_worked' => 8,
            'overtime_hours' => 0,
            'late_minutes' => 0,
        ]);

        AttendanceRecord::create([
            'employee_id' => $this->employee->id,
            'attendance_date' => Carbon::now()->addDay()->toDateString(),
            'status' => 'absent',
            'hours_worked' => 0,
            'overtime_hours' => 0,
            'late_minutes' => 0,
        ]);

        $result = $this->attendanceService->calculateTotalHours(
            $this->employee->id,
            Carbon::now()->toDateString(),
            Carbon::now()->addDays(2)->toDateString()
        );

        $this->assertEquals(8, $result['total_hours']);
        $this->assertEquals(1, $result['total_days_present']);
        $this->assertEquals(1, $result['total_days_absent']);
    }

    public function test_bulk_import_attendance()
    {
        $records = [
            [
                'employee_id' => $this->employee->id,
                'date' => Carbon::now()->toDateString(),
                'check_in' => '08:00:00',
                'check_out' => '16:00:00',
                'status' => 'present',
            ],
            [
                'employee_id' => $this->employee->id,
                'date' => Carbon::now()->addDay()->toDateString(),
                'check_in' => '09:00:00',
                'check_out' => '17:00:00',
                'status' => 'present',
            ],
        ];

        $imported = $this->attendanceService->bulkImport($records);

        $this->assertCount(2, $imported);
        $this->assertEquals('import', $imported[0]->source);
    }
}
