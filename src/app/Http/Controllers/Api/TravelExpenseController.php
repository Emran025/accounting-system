<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TravelRequest;
use App\Models\TravelExpense;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class TravelExpenseController extends Controller
{
    use BaseApiController;

    public function indexRequests(Request $request)
    {
        $query = TravelRequest::with(['employee']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function storeRequest(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'destination' => 'required|string|max:255',
            'purpose' => 'required|string',
            'departure_date' => 'required|date',
            'return_date' => 'required|date|after:departure_date',
            'estimated_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $validated['request_number'] = 'TR-' . date('Ymd') . '-' . str_pad(TravelRequest::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'draft';

        $travelRequest = TravelRequest::create($validated);
        return response()->json(array_merge(['success' => true], $travelRequest->load('employee')->toArray()), 201);
    }

    public function updateRequestStatus(Request $request, $id)
    {
        $travelRequest = TravelRequest::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:draft,pending_approval,approved,rejected,cancelled,completed',
            'rejection_reason' => 'nullable|string|required_if:status,rejected',
        ]);

        if ($request->status === 'approved') {
            $validated['approved_by'] = auth()->id();
            $validated['approved_at'] = now();
        }

        $travelRequest->update($validated);
        return $this->successResponse($travelRequest->load('employee')->toArray());
    }

    public function indexExpenses(Request $request)
    {
        $query = TravelExpense::with(['travelRequest', 'employee']);
        
        if ($request->filled('travel_request_id')) {
            $query->where('travel_request_id', $request->travel_request_id);
        }
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('expense_date', 'desc')->paginate(15)->toArray());
    }

    public function storeExpense(Request $request)
    {
        $validated = $request->validate([
            'travel_request_id' => 'nullable|exists:travel_requests,id',
            'employee_id' => 'required|exists:employees,id',
            'expense_type' => 'required|in:flight,hotel,meal,transportation,other',
            'expense_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|string|max:3',
            'exchange_rate' => 'nullable|numeric|min:0',
            'receipt_path' => 'nullable|string',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['amount_in_base_currency'] = $validated['amount'] * ($validated['exchange_rate'] ?? 1);
        $validated['status'] = 'pending';
        $validated['is_duplicate'] = false; // Could add duplicate detection logic here

        $expense = TravelExpense::create($validated);
        return response()->json(array_merge(['success' => true], $expense->load('travelRequest', 'employee')->toArray()), 201);
    }

    public function updateExpenseStatus(Request $request, $id)
    {
        $expense = TravelExpense::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:pending,submitted,approved,rejected,reimbursed',
        ]);

        if (in_array($request->status, ['approved', 'rejected'])) {
            $validated['approved_by'] = auth()->id();
        }

        $expense->update($validated);
        return $this->successResponse($expense->load('travelRequest', 'employee')->toArray());
    }
}


