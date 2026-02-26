<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollCycle;
use App\Models\PayrollItem;
use App\Models\PayrollTransaction;
use App\Services\PayrollService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controller for Payroll operations via API.
 * Handles payroll cycle generation, approval workflow, individual payments,
 * and employee payslip access.
 */
class PayrollController extends Controller
{
    use BaseApiController;

    protected $payrollService;

    /**
     * PayrollController constructor.
     * 
     * @param PayrollService $payrollService
     */
    public function __construct(PayrollService $payrollService)
    {
        $this->payrollService = $payrollService;
    }

    /**
     * List all payroll cycles with pagination.
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $cycles = PayrollCycle::with(['current_approver', 'creator'])->orderBy('created_at', 'desc')->paginate(15);
        return response()->json($cycles);
    }

    /**
     * Generate a new payroll cycle.
     * Supports salary, bonus, incentive, and other payment types.
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function generatePayroll(Request $request)
    {
        // Validation for different types
        $rules = [
            'payment_nature' => 'required|string|in:salary,bonus,incentive,other',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
            'payment_date' => 'nullable|date',
        ];

        if ($request->payment_nature !== 'salary') {
            $rules['cycle_name'] = 'required|string|max:100';
            $rules['base_amount'] = 'required_without:individual_amounts|numeric|min:0';
        }

        $request->validate($rules);

        try {
            $cycle = $this->payrollService->generatePayroll(
                $request->all(),
                auth()->user()
            );
            return $this->successResponse($cycle->toArray(), 'Payroll generated successfully', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Approve a payroll cycle.
     * Advances the multi-level approval workflow.
     * 
     * @param Request $request
     * @param int $id Payroll cycle ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function approve(Request $request, $id)
    {
        try {
            $cycle = $this->payrollService->approvePayroll($id, auth()->user());
            return $this->successResponse($cycle->toArray(), 'Payroll approved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Process payment for an entire approved payroll cycle.
     * Posts GL entries and updates cycle status to 'paid'.
     * 
     * @param Request $request
     * @param int $id Payroll cycle ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function processPayment(Request $request, $id)
    {
        try {
            $cycle = $this->payrollService->processPayment($id, $request->account_id);
            return $this->successResponse($cycle->toArray(), 'Payroll payment processed successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function toggleItemStatus(Request $request, $itemId)
    {
        try {
            $item = $this->payrollService->toggleItemStatus($itemId);
            return $this->successResponse($item->toArray(), 'Item status toggled successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    public function getCycleItems($cycleId)
    {
        try {
            $items = PayrollItem::where('payroll_cycle_id', $cycleId)
                ->with('employee:id,full_name,employee_code')
                ->get()
                ->map(function ($item) {
                    $paidAmount = PayrollTransaction::where('payroll_item_id', $item->id)
                        ->where('transaction_type', 'payment')
                        ->sum('amount');

                    $advanceAmount = PayrollTransaction::where('payroll_item_id', $item->id)
                        ->where('transaction_type', 'advance')
                        ->sum('amount');

                    $remainingBalance = $item->net_salary - $paidAmount;
                    $netAfterAdvance = $item->net_salary - $advanceAmount;

                    return [
                        'id' => $item->id,
                        'payroll_cycle_id' => $item->payroll_cycle_id,
                        'employee_id' => $item->employee_id,
                        'employee_name' => $item->employee->full_name ?? 'N/A',
                        'employee' => $item->employee,
                        'base_salary' => (float) $item->base_salary,
                        'total_allowances' => (float) $item->total_allowances,
                        'total_deductions' => (float) $item->total_deductions,
                        'gross_salary' => (float) $item->gross_salary,
                        'net_salary' => (float) $item->net_salary,
                        'status' => $item->status, // active or on_hold
                        'paid_amount' => (float) $paidAmount,
                        'remaining_balance' => (float) $remainingBalance,
                        'advance_amount' => (float) $advanceAmount,
                        'net_after_advance' => (float) $netAfterAdvance,
                        'notes' => $item->notes,
                    ];
                });

            $cycle = PayrollCycle::with(['current_approver', 'creator'])->findOrFail($cycleId);

            return $this->successResponse([
                'data' => $items,
                'cycle' => $cycle
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Pay an individual payroll item (partial or full).
     * Creates PayrollTransaction records and posts journal entries.
     * 
     * @param Request $request
     * @param int $itemId Payroll item ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function payIndividualItem(Request $request, $itemId)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'account_id' => 'nullable|exists:chart_of_accounts,id'
        ]);

        try {
            DB::beginTransaction();

            $item = PayrollItem::with('payrollCycle')->findOrFail($itemId);

            if ($item->status === 'on_hold') {
                throw new \Exception('لا يمكن صرف الراتب لموظف تم إيقاف صرفه');
            }

            if ($item->payrollCycle->status !== 'approved') {
                throw new \Exception('لا يمكن صرف الرواتب إلا للدورات المعتمدة');
            }

            $paidAmount = PayrollTransaction::where('payroll_item_id', $itemId)
                ->where('transaction_type', 'payment')
                ->sum('amount');

            $remainingBalance = $item->net_salary - $paidAmount;

            if ($request->amount > $remainingBalance + 0.01) {
                throw new \Exception('المبلغ المدخل أكبر من الرصيد المتبقي');
            }

            $transaction = PayrollTransaction::create([
                'payroll_item_id' => $itemId,
                'transaction_type' => 'payment',
                'amount' => $request->amount,
                'transaction_date' => now(),
                'notes' => $request->notes,
                'created_by' => auth()->id()
            ]);

            $this->payrollService->createPaymentJournalEntry($item, $request->amount, $transaction->id, $request->account_id);

            $this->payrollService->checkAndSetPaidStatus($item->payroll_cycle_id);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل الدفعة بنجاح',
                'transaction' => $transaction
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    private function updateCycleStatus($cycleId)
    {
        $cycle = PayrollCycle::findOrFail($cycleId);
        $items = PayrollItem::where('payroll_cycle_id', $cycleId)->get();

        $allPaid = true;
        foreach ($items as $item) {
            if ($item->status === 'on_hold') continue;
            
            $paidAmount = PayrollTransaction::where('payroll_item_id', $item->id)
                ->where('transaction_type', 'payment')
                ->sum('amount');

            if ($paidAmount < $item->net_salary - 0.01) {
                $allPaid = false;
                break;
            }
        }

        if ($allPaid && $cycle->status === 'approved') {
            $cycle->update(['status' => 'paid']);
        }
    }

    public function getItemTransactions($itemId)
    {
        try {
            $transactions = PayrollTransaction::where('payroll_item_id', $itemId)
                ->orderBy('transaction_date', 'desc')
                ->get();
            return response()->json(['data' => $transactions]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function updateItem(Request $request, $itemId)
    {
        $request->validate([
            'base_salary' => 'required|numeric|min:0',
            'total_allowances' => 'required|numeric|min:0',
            'total_deductions' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        try {
            $item = $this->payrollService->updatePayrollItem($itemId, $request->all());
            return $this->successResponse($item->toArray(), 'Payroll item updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get payslips for the authenticated employee
     */
    public function myPayslips(Request $request)
    {
        $user = auth()->user();
        $employee = \App\Models\Employee::where('user_id', $user->id)->first();

        if (!$employee) {
            return response()->json(['error' => 'Employee record not found'], 404);
        }

        $query = PayrollItem::where('employee_id', $employee->id)
            ->with(['payrollCycle', 'employee'])
            ->whereHas('payrollCycle', function($q) {
                $q->where('status', 'approved');
            });

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereHas('payrollCycle', function($q) use ($request) {
                $q->whereBetween('period_start', [$request->start_date, $request->end_date])
                  ->orWhereBetween('period_end', [$request->start_date, $request->end_date]);
            });
        }

        $items = $query->orderBy('created_at', 'desc')->paginate(15);

        // Add payment status to each item
        $items->getCollection()->transform(function($item) {
            $paidAmount = PayrollTransaction::where('payroll_item_id', $item->id)
                ->where('transaction_type', 'payment')
                ->sum('amount');
            
            $item->paid_amount = $paidAmount;
            $item->remaining_balance = $item->net_salary - $paidAmount;
            return $item;
        });

        return response()->json($items);
    }
}
