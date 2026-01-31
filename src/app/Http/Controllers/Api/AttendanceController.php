<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AttendanceService;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    protected $attendanceService;

    public function __construct(AttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
    }

    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        $records = $this->attendanceService->getAttendanceForPeriod(
            $request->employee_id,
            $request->start_date,
            $request->end_date
        );

        return response()->json($records);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'attendance_date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i|after:check_in',
            'status' => 'nullable|in:present,absent,leave,holiday,weekend',
            'notes' => 'nullable|string',
            'source' => 'nullable|string|in:manual,biometric,import'
        ]);

        try {
            $attendance = $this->attendanceService->recordAttendance(
                $validated['employee_id'],
                $validated['attendance_date'],
                $validated
            );

            return response()->json($attendance, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function bulkImport(Request $request)
    {
        $validated = $request->validate([
            'records' => 'required|array',
            'records.*.employee_id' => 'required|exists:employees,id',
            'records.*.date' => 'required|date',
            'records.*.check_in' => 'nullable|date_format:H:i',
            'records.*.check_out' => 'nullable|date_format:H:i',
            'records.*.status' => 'nullable|in:present,absent,leave,holiday,weekend'
        ]);

        try {
            $imported = $this->attendanceService->bulkImport($validated['records']);
            return response()->json(['message' => 'Import successful', 'imported' => $imported], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function getSummary(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        $summary = $this->attendanceService->calculateTotalHours(
            $request->employee_id,
            $request->start_date,
            $request->end_date
        );

        return response()->json($summary);
    }

    /**
     * Get attendance records for the authenticated employee
     */
    public function myAttendance(Request $request)
    {
        $user = auth()->user();
        $employee = \App\Models\Employee::where('user_id', $user->id)->first();

        if (!$employee) {
            return response()->json(['error' => 'Employee record not found'], 404);
        }

        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->endOfMonth()->toDateString());

        $records = $this->attendanceService->getAttendanceForPeriod(
            $employee->id,
            $startDate,
            $endDate
        );

        $summary = $this->attendanceService->calculateTotalHours(
            $employee->id,
            $startDate,
            $endDate
        );

        return response()->json([
            'records' => $records,
            'summary' => $summary
        ]);
    }
}

