<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollComponent;
use Illuminate\Http\Request;

class PayrollComponentsController extends Controller
{
    public function index()
    {
        $components = PayrollComponent::orderBy('display_order')->orderBy('component_name')->get();
        return response()->json($components);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'component_code' => 'required|string|max:50|unique:payroll_components,component_code',
            'component_name' => 'required|string|max:100',
            'component_type' => 'required|in:allowance,deduction,overtime,bonus,other',
            'calculation_type' => 'required|in:fixed,percentage,formula,attendance_based',
            'base_amount' => 'nullable|numeric|min:0',
            'percentage' => 'nullable|numeric|min:0|max:100',
            'formula' => 'nullable|string',
            'is_taxable' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'integer|min:0',
            'description' => 'nullable|string'
        ]);

        $component = PayrollComponent::create($validated);
        return response()->json($component, 201);
    }

    public function update(Request $request, $id)
    {
        $component = PayrollComponent::findOrFail($id);
        
        $validated = $request->validate([
            'component_code' => 'sometimes|string|max:50|unique:payroll_components,component_code,' . $id,
            'component_name' => 'sometimes|string|max:100',
            'component_type' => 'sometimes|in:allowance,deduction,overtime,bonus,other',
            'calculation_type' => 'sometimes|in:fixed,percentage,formula,attendance_based',
            'base_amount' => 'nullable|numeric|min:0',
            'percentage' => 'nullable|numeric|min:0|max:100',
            'formula' => 'nullable|string',
            'is_taxable' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'integer|min:0',
            'description' => 'nullable|string'
        ]);

        $component->update($validated);
        return response()->json($component);
    }

    public function destroy($id)
    {
        $component = PayrollComponent::findOrFail($id);
        $component->delete();
        return response()->json(null, 204);
    }

    public function show($id)
    {
        $component = PayrollComponent::findOrFail($id);
        return response()->json($component);
    }
}



