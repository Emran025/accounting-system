<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollEntry;
use App\Models\Prepayment;
use App\Models\UnearnedRevenue;
use App\Services\PermissionService;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AccrualAccountingController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;

    public function __construct(LedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('accrual_accounting', 'view');

        $module = $request->query('module');
        $limit = $request->query('limit', 20);

        if ($module === 'payroll') {
            $data = PayrollEntry::orderBy('payroll_date', 'desc')->paginate($limit);
        } elseif ($module === 'prepayments') {
            $data = Prepayment::orderBy('prepayment_date', 'desc')->paginate($limit);
        } elseif ($module === 'unearned_revenue') {
            $data = UnearnedRevenue::orderBy('receipt_date', 'desc')->paginate($limit);
        } else {
            return $this->errorResponse('Invalid module');
        }

        return response()->json([
            'success' => true,
            'data' => $data->items(),
            'total' => $data->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('accrual_accounting', 'create');
        $module = $request->query('module');

        if ($module === 'payroll') {
            $validated = $request->validate([
                'payroll_date' => 'required|date',
                'gross_pay' => 'required|numeric',
                'deductions' => 'nullable|numeric',
                'description' => 'nullable|string',
            ]);
            $validated['net_pay'] = $validated['gross_pay'] - ($validated['deductions'] ?? 0);
            $entry = PayrollEntry::create($validated);
            
            // Post to GL (Simulating legacy logic)
            // Debit Salaries Expense, Credit Salaries Payable
            $this->ledgerService->postTransaction([
                ['account_code' => '5220', 'entry_type' => 'DEBIT', 'amount' => $validated['gross_pay'], 'description' => $validated['description']],
                ['account_code' => '2130', 'entry_type' => 'CREDIT', 'amount' => $validated['net_pay'], 'description' => $validated['description']],
            ], 'payroll_entries', $entry->id, null, $validated['payroll_date']);

            return $this->successResponse(['id' => $entry->id]);

        } elseif ($module === 'prepayments') {
            $validated = $request->validate([
                'prepayment_date' => 'required|date',
                'total_amount' => 'required|numeric',
                'months' => 'required|integer',
                'description' => 'required|string',
                'expense_account_code' => 'nullable|string',
            ]);
            $entry = Prepayment::create($validated);
            
            // Post to GL: Debit Prepaid Expenses (Asset), Credit Cash
            $this->ledgerService->postTransaction([
                ['account_code' => '1140', 'entry_type' => 'DEBIT', 'amount' => $validated['total_amount'], 'description' => $validated['description']],
                ['account_code' => '1110', 'entry_type' => 'CREDIT', 'amount' => $validated['total_amount'], 'description' => $validated['description']],
            ], 'prepayments', $entry->id, null, $validated['prepayment_date']);

            return $this->successResponse(['id' => $entry->id]);

        } elseif ($module === 'unearned_revenue') {
            $validated = $request->validate([
                'receipt_date' => 'required|date',
                'total_amount' => 'required|numeric',
                'months' => 'required|integer',
                'description' => 'required|string',
                'revenue_account_code' => 'nullable|string',
            ]);
            $entry = UnearnedRevenue::create($validated);
            
            // Post to GL: Debit Cash, Credit Unearned Revenue (Liability)
            $this->ledgerService->postTransaction([
                ['account_code' => '1110', 'entry_type' => 'DEBIT', 'amount' => $validated['total_amount'], 'description' => $validated['description']],
                ['account_code' => '2120', 'entry_type' => 'CREDIT', 'amount' => $validated['total_amount'], 'description' => $validated['description']],
            ], 'unearned_revenue', $entry->id, null, $validated['receipt_date']);

            return $this->successResponse(['id' => $entry->id]);
        }

        return $this->errorResponse('Invalid module');
    }

    public function update(Request $request): JsonResponse
    {
        PermissionService::requirePermission('accrual_accounting', 'edit');
        $module = $request->query('module');
        $id = $request->input('id');

        if ($module === 'prepayments') {
            $prepayment = Prepayment::findOrFail($id);
            $amortization_date = $request->input('amortization_date', now()->format('Y-m-d'));
            $amount = $prepayment->total_amount / $prepayment->months; // Simple straight-line

            if ($prepayment->amortized_amount + $amount > $prepayment->total_amount + 0.01) {
                return $this->errorResponse('Already fully amortized');
            }

            $prepayment->increment('amortized_amount', $amount);
            
            // Post Amortization: Debit Expense, Credit Prepaid Expenses
            $this->ledgerService->postTransaction([
                ['account_code' => $prepayment->expense_account_code ?? '5200', 'entry_type' => 'DEBIT', 'amount' => $amount, 'description' => 'Amortization: ' . $prepayment->description],
                ['account_code' => '1140', 'entry_type' => 'CREDIT', 'amount' => $amount, 'description' => 'Amortization: ' . $prepayment->description],
            ], 'prepayments', $prepayment->id, null, $amortization_date);

            return $this->successResponse();

        } elseif ($module === 'unearned_revenue') {
            $unearned = UnearnedRevenue::findOrFail($id);
            $recognition_date = $request->input('recognition_date', now()->format('Y-m-d'));
            $amount = $unearned->total_amount / $unearned->months;

            if ($unearned->recognized_amount + $amount > $unearned->total_amount + 0.01) {
                return $this->errorResponse('Already fully recognized');
            }

            $unearned->increment('recognized_amount', $amount);
            
            // Post Recognition: Debit Unearned Revenue, Credit Revenue
            $this->ledgerService->postTransaction([
                ['account_code' => '2120', 'entry_type' => 'DEBIT', 'amount' => $amount, 'description' => 'Recognition: ' . $unearned->description],
                ['account_code' => $unearned->revenue_account_code ?? '4100', 'entry_type' => 'CREDIT', 'amount' => $amount, 'description' => 'Recognition: ' . $unearned->description],
            ], 'unearned_revenue', $unearned->id, null, $recognition_date);

            return $this->successResponse();
        }

        return $this->errorResponse('Invalid module or action');
    }
}
