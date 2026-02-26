<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpatManagement;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class ExpatManagementController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = ExpatManagement::with(['employee', 'documents']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%");
            });
        }
        
        return $this->successResponse($query->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'passport_number' => 'nullable|string|max:50',
            'passport_expiry' => 'nullable|date',
            'visa_number' => 'nullable|string|max:50',
            'visa_expiry' => 'nullable|date',
            'work_permit_number' => 'nullable|string|max:50',
            'work_permit_expiry' => 'nullable|date',
            'residency_number' => 'nullable|string|max:50',
            'residency_expiry' => 'nullable|date',
            'host_country' => 'nullable|string|max:100',
            'home_country' => 'nullable|string|max:100',
            'cost_of_living_adjustment' => 'nullable|numeric|min:0',
            'housing_allowance' => 'nullable|numeric|min:0',
            'relocation_package' => 'nullable|numeric|min:0',
            'tax_equalization' => 'boolean',
            'repatriation_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = auth()->id();
        $expat = ExpatManagement::create($validated);
        
        return response()->json(array_merge(['success' => true], $expat->load('employee')->toArray()), 201);
    }

    public function show($id)
    {
        $expat = ExpatManagement::with(['employee', 'documents'])->findOrFail($id);
        return $this->successResponse($expat->toArray());
    }

    public function update(Request $request, $id)
    {
        $expat = ExpatManagement::findOrFail($id);
        
        $validated = $request->validate([
            'passport_number' => 'nullable|string|max:50',
            'passport_expiry' => 'nullable|date',
            'visa_number' => 'nullable|string|max:50',
            'visa_expiry' => 'nullable|date',
            'work_permit_number' => 'nullable|string|max:50',
            'work_permit_expiry' => 'nullable|date',
            'residency_number' => 'nullable|string|max:50',
            'residency_expiry' => 'nullable|date',
            'host_country' => 'nullable|string|max:100',
            'home_country' => 'nullable|string|max:100',
            'cost_of_living_adjustment' => 'nullable|numeric|min:0',
            'housing_allowance' => 'nullable|numeric|min:0',
            'relocation_package' => 'nullable|numeric|min:0',
            'tax_equalization' => 'boolean',
            'repatriation_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $expat->update($validated);
        return $this->successResponse($expat->load('employee', 'documents')->toArray());
    }

    public function destroy($id)
    {
        $expat = ExpatManagement::findOrFail($id);
        $expat->delete();
        return $this->successResponse(['message' => 'Expat record deleted successfully']);
    }
}

