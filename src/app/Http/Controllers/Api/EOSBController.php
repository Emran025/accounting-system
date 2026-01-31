<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EOSBCalculatorService;
use App\Models\Employee;
use Illuminate\Http\Request;

class EOSBController extends Controller
{
    protected $eosbCalculator;

    public function __construct(EOSBCalculatorService $eosbCalculator)
    {
        $this->eosbCalculator = $eosbCalculator;
    }

    /**
     * Calculate EOSB for an employee
     */
    public function calculate(Request $request, $employeeId)
    {
        $validated = $request->validate([
            'termination_date' => 'required|date',
            'termination_reason' => 'required|in:resignation,termination,end_of_contract'
        ]);

        try {
            $employee = Employee::findOrFail($employeeId);
            
            $calculation = $this->eosbCalculator->calculate(
                $employee,
                $validated['termination_date'],
                $validated['termination_reason']
            );

            return response()->json($calculation);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Preview EOSB calculation without saving
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'termination_date' => 'required|date',
            'termination_reason' => 'required|in:resignation,termination,end_of_contract'
        ]);

        try {
            $employee = Employee::findOrFail($validated['employee_id']);
            
            $calculation = $this->eosbCalculator->calculate(
                $employee,
                $validated['termination_date'],
                $validated['termination_reason']
            );

            return response()->json($calculation);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}

