<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContingentWorker;
use App\Models\ContingentContract;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class ContingentWorkersController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = ContingentWorker::with(['contracts']);
        
        if ($request->filled('worker_type')) {
            $query->where('worker_type', $request->worker_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('worker_code', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:100',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'worker_type' => 'required|in:contractor,consultant,freelancer,temp_agency',
            'company_name' => 'nullable|string|max:255',
            'tax_id' => 'nullable|string|max:50',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
            'service_description' => 'nullable|string',
            'sow_number' => 'nullable|string|max:50',
            'hourly_rate' => 'nullable|numeric|min:0',
            'monthly_rate' => 'nullable|numeric|min:0',
            'contract_terms' => 'nullable|string',
            'badge_expiry' => 'nullable|date',
            'system_access_expiry' => 'nullable|date',
            'has_insurance' => 'boolean',
            'insurance_details' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['worker_code'] = 'CW-' . date('Ymd') . '-' . str_pad(ContingentWorker::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'active';
        $validated['created_by'] = auth()->id();

        $worker = ContingentWorker::create($validated);
        return response()->json(array_merge(['success' => true], $worker->load('contracts')->toArray()), 201);
    }

    public function show($id)
    {
        $worker = ContingentWorker::with(['contracts'])->findOrFail($id);
        return $this->successResponse($worker->toArray());
    }

    public function update(Request $request, $id)
    {
        $worker = ContingentWorker::findOrFail($id);
        
        $validated = $request->validate([
            'full_name' => 'string|max:100',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'status' => 'in:active,inactive,terminated',
            'end_date' => 'nullable|date',
            'badge_expiry' => 'nullable|date',
            'system_access_expiry' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $worker->update($validated);
        return $this->successResponse($worker->load('contracts')->toArray());
    }

    public function storeContract(Request $request, $workerId)
    {
        $validated = $request->validate([
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'nullable|date',
            'contract_terms' => 'nullable|string',
            'file_path' => 'nullable|string',
            'total_value' => 'nullable|numeric|min:0',
        ]);

        $validated['worker_id'] = $workerId;
        $validated['contract_number'] = 'CNT-' . date('Ymd') . '-' . str_pad(ContingentContract::count() + 1, 4, '0', STR_PAD_LEFT);
        $validated['status'] = 'draft';
        $validated['created_by'] = auth()->id();

        $contract = ContingentContract::create($validated);
        return response()->json(array_merge(['success' => true], $contract->load('worker')->toArray()), 201);
    }
}


