<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ChartOfAccountsController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;

    public function __construct(LedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    /**
     * Get all chart of accounts
     */
    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('chart_of_accounts', 'view');

        $search = $request->input('search');

        $query = ChartOfAccount::with('parent');

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('account_code', 'like', "%$search%")
                  ->orWhere('account_name', 'like', "%$search%");
            });
        }

        $accounts = $query->orderBy('account_code')->get();

        $mappedAccounts = $accounts->map(function ($account) {
            return [
                'id' => $account->id,
                'code' => $account->account_code,
                'name' => $account->account_name,
                'type' => strtolower($account->account_type),
                'parent_id' => $account->parent_id,
                'parent_name' => $account->parent?->account_name,
                'balance' => $this->ledgerService->getAccountBalance($account->account_code),
                'is_active' => $account->is_active,
                'description' => $account->description,
            ];
        });

        return response()->json([
            'success' => true,
            'accounts' => $mappedAccounts
        ]);
    }

    /**
     * Create new account
     */
    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('chart_of_accounts', 'create');

        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:chart_of_accounts,account_code',
            'name' => 'required|string|max:255',
            'type' => 'required|in:asset,liability,equity,revenue,expense',
            'parent_id' => 'nullable|integer|exists:chart_of_accounts,id',
            'description' => 'nullable|string',
        ]);

        $account = ChartOfAccount::create([
            'account_code' => $validated['code'],
            'account_name' => $validated['name'],
            'account_type' => ucfirst($validated['type']),
            'parent_id' => $validated['parent_id'],
            'description' => $validated['description'],
            'is_active' => true,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'chart_of_accounts', $account->id, null, $validated);

        return $this->successResponse(['id' => $account->id]);
    }

    /**
     * Update account
     */
    public function update(Request $request, $id): JsonResponse
    {
        PermissionService::requirePermission('chart_of_accounts', 'edit');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:asset,liability,equity,revenue,expense',
            'parent_id' => 'nullable|integer|exists:chart_of_accounts,id',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $account = ChartOfAccount::findOrFail($id);
        $oldValues = $account->toArray();
        
        $account->update([
            'account_name' => $validated['name'],
            'account_type' => ucfirst($validated['type']),
            'parent_id' => $validated['parent_id'],
            'description' => $validated['description'],
            'is_active' => $validated['is_active'] ?? $account->is_active,
        ]);

        TelescopeService::logOperation('UPDATE', 'chart_of_accounts', $account->id, $oldValues, $validated);

        return $this->successResponse();
    }

    /**
     * Deactivate account (soft delete)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        PermissionService::requirePermission('chart_of_accounts', 'delete');

        $account = ChartOfAccount::findOrFail($id);

        // Check if account has transactions
        $hasTransactions = \App\Models\GeneralLedger::where('account_id', $account->id)->exists();

        if ($hasTransactions) {
            // Deactivate instead of delete
            $account->update(['is_active' => false]);
            $message = 'Account deactivated (has transaction history)';
        } else {
            $account->delete();
            $message = 'Account deleted successfully';
        }

        TelescopeService::logOperation('DELETE', 'chart_of_accounts', $id, $account->toArray(), null);

        return $this->successResponse(['message' => $message]);
    }

    /**
     * Get account balances summary
     */
    public function balances(Request $request): JsonResponse
    {
        PermissionService::requirePermission('chart_of_accounts', 'view');

        $asOfDate = $request->input('as_of_date');
        $accountType = $request->input('account_type');

        $query = ChartOfAccount::where('is_active', true);

        if ($accountType) {
            $query->where('account_type', $accountType);
        }

        $accounts = $query->orderBy('account_code')->get();

        $balances = $accounts->map(function ($account) use ($asOfDate) {
            $balance = $this->ledgerService->getAccountBalance($account->account_code, $asOfDate);
            
            return [
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_type' => $account->account_type,
                'balance' => $balance,
            ];
        });

        // Calculate totals by type
        $totals = [
            'Asset' => 0,
            'Liability' => 0,
            'Equity' => 0,
            'Revenue' => 0,
            'Expense' => 0,
        ];

        foreach ($balances as $account) {
            $totals[$account['account_type']] += $account['balance'];
        }

        return response()->json([
            'success' => true,
            'as_of_date' => $asOfDate ?? now()->format('Y-m-d'),
            'accounts' => $balances,
            'totals' => $totals,
        ]);
    }
}
