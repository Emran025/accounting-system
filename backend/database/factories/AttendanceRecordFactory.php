<?php

namespace Database\Factories;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceRecordFactory extends Factory
{
    protected $model = AttendanceRecord::class;

    public function definition()
    {
        $attendanceDate = $this->faker->dateTimeBetween('-1 month', 'now');
        $checkIn = (clone $attendanceDate)->setTime(9, 0, 0);
        $checkOut = (clone $attendanceDate)->setTime(17, 0, 0);

        return [
            'employee_id' => Employee::factory(),
            'attendance_date' => $attendanceDate->format('Y-m-d'),
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'status' => 'present',
            'hours_worked' => 8.00,
            'overtime_hours' => 0.00,
            'is_late' => false,
            'late_minutes' => 0,
            'notes' => $this->faker->sentence(),
            'source' => 'manual',
            'created_by' => User::factory(),
        ];
    }
}
