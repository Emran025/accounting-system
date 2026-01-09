<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollCycle;
use App\Services\PayrollService;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    protected $payrollService;

    public function __construct(PayrollService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    public function index()
    {
        return response()->json(PayrollCycle::orderBy('created_at', 'desc')->paginate(15));
    }

    public function generatePayroll(Request $request)
    {
        $request->validate([
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start'
        ]);

        try {
            $cycle = $this->payrollService->generatePayroll(
                $request->period_start,
                $request->period_end,
                $request->user()
            );
            return response()->json($cycle, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function approve(Request $request, $id)
    {
        try {
            $cycle = $this->payrollService->approvePayroll($id, $request->user());
            return response()->json($cycle);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function processPayment(Request $request, $id)
    {
        try {
            $cycle = $this->payrollService->processPayment($id);
            return response()->json($cycle);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
