<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LeaveService;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    protected $leaveService;

    public function __construct(LeaveService $leaveService)
    {
        $this->leaveService = $leaveService;
    }

    public function index(Request $request)
    {
        $query = LeaveRequest::with(['employee', 'approver', 'creator']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->where(function($q) use ($request) {
                $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                  ->orWhereBetween('end_date', [$request->start_date, $request->end_date]);
            });
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type' => 'required|in:vacation,sick,emergency,unpaid,other',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string'
        ]);

        try {
            $leaveRequest = $this->leaveService->createLeaveRequest(
                $validated['employee_id'],
                $validated
            );

            return response()->json($leaveRequest, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function approve(Request $request, $id)
    {
        $validated = $request->validate([
            'action' => 'required|in:approved,rejected',
            'reason' => 'nullable|string|required_if:action,rejected'
        ]);

        try {
            $leaveRequest = $this->leaveService->processLeaveRequest(
                $id,
                $validated['action'],
                auth()->id(),
                $validated['reason'] ?? null
            );

            return response()->json($leaveRequest);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function show($id)
    {
        $leaveRequest = LeaveRequest::with(['employee', 'approver', 'creator'])->findOrFail($id);
        return response()->json($leaveRequest);
    }

    public function cancel($id)
    {
        $leaveRequest = LeaveRequest::findOrFail($id);
        
        if ($leaveRequest->status !== 'pending') {
            return response()->json(['error' => 'Only pending leave requests can be cancelled'], 400);
        }

        $leaveRequest->update(['status' => 'cancelled']);
        return response()->json($leaveRequest);
    }

    /**
     * Get leave requests for the authenticated employee
     */
    public function myLeaveRequests(Request $request)
    {
        $user = auth()->user();
        $employee = \App\Models\Employee::where('user_id', $user->id)->first();

        if (!$employee) {
            return response()->json(['error' => 'Employee record not found'], 404);
        }

        $query = LeaveRequest::where('employee_id', $employee->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(15));
    }
}

