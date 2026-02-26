<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PostPayrollIntegration;
use App\Models\PayrollCycle;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\BaseApiController;

class PostPayrollController extends Controller
{
    use BaseApiController;

    public function index(Request $request)
    {
        $query = PostPayrollIntegration::with(['payrollCycle']);
        
        if ($request->filled('payroll_cycle_id')) {
            $query->where('payroll_cycle_id', $request->payroll_cycle_id);
        }
        
        if ($request->filled('integration_type')) {
            $query->where('integration_type', $request->integration_type);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        return $this->successResponse($query->orderBy('created_at', 'desc')->paginate(15)->toArray());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'payroll_cycle_id' => 'required|exists:payroll_cycles,id',
            'integration_type' => 'required|in:bank_file,gl_entry,third_party_pay,garnishment',
            'file_format' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        $payrollCycle = PayrollCycle::with('items')->findOrFail($validated['payroll_cycle_id']);
        
        // Calculate total amount based on integration type
        $totalAmount = 0;
        $transactionCount = 0;
        
        if ($validated['integration_type'] === 'bank_file') {
            // Sum all paid items
            $totalAmount = $payrollCycle->items()->where('status', 'paid')->sum('net_pay');
            $transactionCount = $payrollCycle->items()->where('status', 'paid')->count();
        } elseif ($validated['integration_type'] === 'gl_entry') {
            // Sum total payroll cost
            $totalAmount = $payrollCycle->items()->sum('gross_pay');
            $transactionCount = $payrollCycle->items()->count();
        }

        $validated['status'] = 'pending';
        $validated['total_amount'] = $totalAmount;
        $validated['transaction_count'] = $transactionCount;

        $integration = PostPayrollIntegration::create($validated);
        return response()->json(array_merge(['success' => true], $integration->load('payrollCycle')->toArray()), 201);
    }

    public function process(Request $request, $id)
    {
        $integration = PostPayrollIntegration::findOrFail($id);
        
        if ($integration->status !== 'pending') {
            return $this->errorResponse('Integration already processed', 400);
        }

        try {
            // Simulate processing - in real implementation, this would:
            // 1. Generate bank file (NACHA/SEPA format)
            // 2. Create GL entries
            // 3. Process third-party payments
            // 4. Handle garnishments
            
            $integration->update([
                'status' => 'processing',
                'processed_by' => auth()->id(),
            ]);

            // Simulate file generation
            $fileName = $integration->integration_type . '_' . date('YmdHis') . '.txt';
            $integration->update([
                'file_path' => 'storage/payroll/' . $fileName,
                'status' => 'completed',
                'processed_at' => now(),
            ]);

            return $this->successResponse($integration->load('payrollCycle')->toArray());
        } catch (\Exception $e) {
            $integration->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            return $this->errorResponse('Processing failed: ' . $e->getMessage(), 500);
        }
    }

    public function reconcile(Request $request, $id)
    {
        $integration = PostPayrollIntegration::findOrFail($id);
        
        $validated = $request->validate([
            'reconciled_amount' => 'required|numeric|min:0',
        ]);

        $integration->update([
            'status' => 'reconciled',
            'reconciled_at' => now(),
        ]);

        return $this->successResponse($integration->load('payrollCycle')->toArray());
    }
}


