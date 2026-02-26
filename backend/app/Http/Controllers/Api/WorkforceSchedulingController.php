<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkforceSchedule;
use App\Models\ScheduleShift;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class WorkforceSchedulingController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = WorkforceSchedule::with(['department', 'shifts.employee']);
        
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('schedule_date')) {
            $query->where('schedule_date', $request->schedule_date);
        }
        
        return $this->successResponse($query->orderBy('schedule_date', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'schedule_name' => 'required|string|max:255',
            'schedule_date' => 'required|date',
            'department_id' => 'nullable|exists:departments,id',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'draft';
        $validated['created_by'] = auth()->id();

        $schedule = WorkforceSchedule::create($validated);
        return response()->json(array_merge(['success' => true], $schedule->load('department')->toArray()), 201);
    }

    public function show($id)
    {
        $schedule = WorkforceSchedule::with(['department', 'shifts.employee'])->findOrFail($id);
        return $this->successResponse($schedule->toArray());
    }

    public function update(Request $request, $id)
    {
        $schedule = WorkforceSchedule::findOrFail($id);
        
        $validated = $request->validate([
            'schedule_name' => 'string|max:255',
            'status' => 'in:draft,published,archived',
            'notes' => 'nullable|string',
        ]);

        $schedule->update($validated);
        return $this->successResponse($schedule->load('department', 'shifts.employee')->toArray());
    }

    public function storeShift(Request $request, $scheduleId)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'shift_date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'shift_type' => 'required|in:regular,overtime,on_call,standby',
            'notes' => 'nullable|string',
        ]);

        $start = \Carbon\Carbon::parse($validated['shift_date'] . ' ' . $validated['start_time']);
        $end = \Carbon\Carbon::parse($validated['shift_date'] . ' ' . $validated['end_time']);
        $hours = $start->diffInHours($end);

        $validated['schedule_id'] = $scheduleId;
        $validated['hours'] = $hours;
        $validated['status'] = 'scheduled';

        $shift = ScheduleShift::create($validated);
        return response()->json(array_merge(['success' => true], $shift->load('employee')->toArray()), 201);
    }

    public function updateShift(Request $request, $scheduleId, $shiftId)
    {
        $shift = ScheduleShift::where('schedule_id', $scheduleId)->findOrFail($shiftId);
        
        $validated = $request->validate([
            'status' => 'in:scheduled,confirmed,swapped,cancelled,completed',
            'swapped_with' => 'nullable|exists:employees,id',
            'notes' => 'nullable|string',
        ]);

        $shift->update($validated);
        return $this->successResponse($shift->load('employee')->toArray());
    }
}


