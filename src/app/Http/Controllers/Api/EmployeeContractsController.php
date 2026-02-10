<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeContract;
use Illuminate\Http\Request;

class EmployeeContractsController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = EmployeeContract::with(['employee', 'creator'])->orderByDesc('contract_start_date');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('is_current')) {
            $query->where('is_current', $request->is_current === 'true');
        }

        return $this->successResponse($query->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'contract_start_date' => 'required|date',
            'contract_end_date' => 'nullable|date|after_or_equal:contract_start_date',
            'probation_end_date' => 'nullable|date|after_or_equal:contract_start_date',
            'base_salary' => 'required|numeric|min:0',
            'signing_bonus' => 'nullable|numeric|min:0',
            'retention_allowance' => 'nullable|numeric|min:0',
            'contract_type' => 'required|in:full_time,part_time,contract,freelance',
            'working_hours_per_day' => 'nullable|integer|min:1|max:24',
            'working_days_per_week' => 'nullable|integer|min:1|max:7',
            'nda_signed' => 'boolean',
            'non_compete_signed' => 'boolean',
            'contract_file_path' => 'nullable|string',
            'notes' => 'nullable|string',
            'is_current' => 'boolean',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['contract_number'] = $validated['contract_number'] ?? ('CTR-' . date('Ymd') . '-' . str_pad(EmployeeContract::count() + 1, 5, '0', STR_PAD_LEFT));
        $validated['renewal_reminder_sent'] = false;

        $contract = EmployeeContract::create($validated);

        // Ensure only one current contract per employee
        if (($validated['is_current'] ?? false) === true) {
            EmployeeContract::where('employee_id', $validated['employee_id'])
                ->where('id', '!=', $contract->id)
                ->update(['is_current' => false]);
        }

        return response()->json(array_merge(['success' => true], $contract->load(['employee', 'creator'])->toArray()), 201);
    }

    public function show($id)
    {
        $contract = EmployeeContract::with(['employee', 'creator'])->findOrFail($id);
        return $this->successResponse($contract->toArray());
    }

    public function update(Request $request, $id)
    {
        $contract = EmployeeContract::findOrFail($id);

        $validated = $request->validate([
            'contract_start_date' => 'date',
            'contract_end_date' => 'nullable|date',
            'probation_end_date' => 'nullable|date',
            'base_salary' => 'numeric|min:0',
            'signing_bonus' => 'nullable|numeric|min:0',
            'retention_allowance' => 'nullable|numeric|min:0',
            'contract_type' => 'in:full_time,part_time,contract,freelance',
            'working_hours_per_day' => 'nullable|integer|min:1|max:24',
            'working_days_per_week' => 'nullable|integer|min:1|max:7',
            'is_current' => 'boolean',
            'nda_signed' => 'boolean',
            'non_compete_signed' => 'boolean',
            'contract_file_path' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $contract->update($validated);

        if ($request->has('is_current') && $request->boolean('is_current') === true) {
            EmployeeContract::where('employee_id', $contract->employee_id)
                ->where('id', '!=', $contract->id)
                ->update(['is_current' => false]);
        }

        return $this->successResponse($contract->load(['employee', 'creator'])->toArray());
    }

    public function destroy($id)
    {
        $contract = EmployeeContract::findOrFail($id);
        $contract->delete();
        return $this->successResponse([], 'Contract deleted successfully');
    }
}


