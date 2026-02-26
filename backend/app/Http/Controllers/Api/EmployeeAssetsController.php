<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeAsset;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class EmployeeAssetsController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = EmployeeAsset::with(['employee', 'costCenter']);
        
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'asset_code' => 'required|string|max:50|unique:employee_assets,asset_code',
            'asset_name' => 'required|string|max:255',
            'asset_type' => 'required|in:laptop,phone,vehicle,key,equipment,other',
            'serial_number' => 'nullable|string|max:100',
            'qr_code' => 'nullable|string|max:100',
            'allocation_date' => 'required|date',
            'cost_center_id' => 'nullable|exists:chart_of_accounts,id',
            'next_maintenance_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = 'allocated';
        $validated['created_by'] = auth()->id();
        $asset = EmployeeAsset::create($validated);
        
        return response()->json(array_merge(['success' => true], $asset->load('employee')->toArray()), 201);
    }

    public function show($id)
    {
        $asset = EmployeeAsset::with(['employee', 'costCenter'])->findOrFail($id);
        return $this->successResponse($asset->toArray());
    }

    public function update(Request $request, $id)
    {
        $asset = EmployeeAsset::findOrFail($id);
        
        $validated = $request->validate([
            'asset_name' => 'string|max:255',
            'asset_type' => 'in:laptop,phone,vehicle,key,equipment,other',
            'serial_number' => 'nullable|string|max:100',
            'status' => 'in:allocated,returned,maintenance,lost,damaged',
            'return_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',
            'maintenance_notes' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $asset->update($validated);
        return $this->successResponse($asset->load('employee', 'costCenter')->toArray());
    }

    public function destroy($id)
    {
        $asset = EmployeeAsset::findOrFail($id);
        $asset->delete();
        return $this->successResponse(['message' => 'Asset deleted successfully']);
    }
}

