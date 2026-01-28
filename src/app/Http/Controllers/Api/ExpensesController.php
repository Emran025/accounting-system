<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;

class ExpensesController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;
    private ChartOfAccountsMappingService $coaService;

    public function __construct(
        LedgerService $ledgerService,
        ChartOfAccountsMappingService $coaService
    ) {
        $this->ledgerService = $ledgerService;
        $this->coaService = $coaService;
    }

    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('expenses', 'view');

        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = Expense::with(['user', 'supplier']);

        $total = $query->count();
        $expenses = $query->orderBy('expense_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse($expenses, $total, $page, $perPage);
    }

    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('expenses', 'create');

        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'account_code' => 'nullable|string|max:20',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'nullable|date',
            'description' => 'nullable|string',
            'payment_type' => 'nullable|in:cash,credit',
            'supplier_id' => 'nullable|exists:ap_suppliers,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $category = $validated['category'];
            $accountCode = $validated['account_code'] ?? null;
            
            if (!$accountCode) {
                // Try to find a leaf account matching the category
                $mapping = [
                    'rent' => 'إيجار',
                    'utilities' => 'مرافق',
                    'salaries' => 'رواتب',
                    'maintenance' => 'صيانة',
                    'supplies' => 'مستلزمات',
                    'marketing' => 'تسويق',
                    'transport' => 'نقل',
                ];
                
                if (isset($mapping[$category])) {
                    $accountCode = $this->coaService->getAccountCode('Expense', $mapping[$category]);
                }
                
                // If still not found, use standard operating expenses leaf
                if (!$accountCode) {
                    $accountCode = $this->coaService->getStandardAccounts()['operating_expenses'];
                }
            }
            
            // Validate account code
            if (!$this->coaService->validateAccountCode($accountCode)) {
                return $this->errorResponse("Invalid account code: $accountCode", 400);
            }

            $expense = Expense::create([
                'category' => $validated['category'],
                'account_code' => $accountCode,
                'amount' => $validated['amount'],
                'expense_date' => $validated['expense_date'] ?? now(),
                'description' => $validated['description'] ?? null,
                'payment_type' => $validated['payment_type'] ?? 'cash',
                'supplier_id' => $validated['supplier_id'] ?? null,
                'user_id' => auth()->id() ?? session('user_id'),
            ]);

            // Generate voucher number
            $voucherNumber = $this->ledgerService->getNextVoucherNumber('EXP');

            // Post to GL
            $accounts = $this->coaService->getStandardAccounts();
            $glEntries = [
                [
                    'account_code' => $accountCode,
                    'entry_type' => 'DEBIT',
                    'amount' => $expense->amount,
                    'description' => "Expense: {$expense->category} - Voucher #$voucherNumber"
                ],
                [
                    'account_code' => $expense->payment_type === 'cash' ? $accounts['cash'] : $accounts['accounts_payable'],
                    'entry_type' => 'CREDIT',
                    'amount' => $expense->amount,
                    'description' => "Expense Payment - Voucher #$voucherNumber"
                ],
            ];

            $this->ledgerService->postTransaction(
                $glEntries,
                'expenses',
                $expense->id,
                $voucherNumber,
                $expense->expense_date->format('Y-m-d')
            );

            TelescopeService::logOperation('CREATE', 'expenses', $expense->id, null, $validated);

            return $this->successResponse([
                'id' => $expense->id,
                'voucher_number' => $voucherNumber,
            ]);
        });
    }

    public function update(Request $request): JsonResponse
    {
        PermissionService::requirePermission('expenses', 'edit');

        $validated = $request->validate([
            'id' => 'required|exists:expenses,id',
            'category' => 'required|string|max:100',
            'account_code' => 'nullable|string|max:20',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'nullable|date',
            'description' => 'nullable|string',
        ]);

        $expense = Expense::findOrFail($validated['id']);
        $oldValues = $expense->toArray();
        $expense->update($validated);

        TelescopeService::logOperation('UPDATE', 'expenses', $expense->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroy(Request $request): JsonResponse
    {
        PermissionService::requirePermission('expenses', 'delete');

        $id = $request->input('id');
        $expense = Expense::findOrFail($id);
        $oldValues = $expense->toArray();
        $expense->delete();

        TelescopeService::logOperation('DELETE', 'expenses', $id, $oldValues, null);

        return $this->successResponse();
    }
}
