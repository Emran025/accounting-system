<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesRepresentative;
use App\Models\GeneralLedger;
use App\Models\SalesRepresentativeTransaction;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Resources\SalesRepresentativeResource;
use App\Http\Resources\SalesRepresentativeTransactionResource;

class SalesRepresentativeController extends Controller
{
    use BaseApiController;

    public function representatives(Request $request): JsonResponse
    {
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $search = $request->input('search', '');

        $query = SalesRepresentative::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%");
            });
        }

        $total = $query->count();
        $representatives = $query->orderBy('name')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->addSelect([
                'total_sales' => \App\Models\SalesRepresentativeTransaction::selectRaw('COALESCE(SUM(
                    (SELECT SUM(amount) FROM general_ledger WHERE general_ledger.voucher_number = sales_representative_transactions.voucher_number AND general_ledger.entry_type = "DEBIT")
                ), 0)')
                    ->whereColumn('sales_representative_id', 'sales_representatives.id')
                    ->where('type', 'commission')
                    ->where('is_deleted', false)
            ])
            ->get()
            ->map(function ($rep) {
                $rep->total_sales = $rep->total_sales ?? 0;
                $rep->total_paid = max(0, $rep->total_sales - $rep->current_balance);
                return $rep;
            });

        return $this->paginatedResponse(
            SalesRepresentativeResource::collection($representatives),
            $total,
            $page,
            $perPage
        );
    }

    public function storeRepresentative(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $exists = SalesRepresentative::where('name', $validated['name'])->exists();
        if ($exists) {
            return $this->errorResponse('Sales Representative with this name already exists', 409);
        }

        $representative = SalesRepresentative::create([
            ...$validated,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'sales_representatives', $representative->id, null, $validated);

        return $this->successResponse(['id' => $representative->id]);
    }

    public function updateRepresentative(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'required|exists:sales_representatives,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $representative = SalesRepresentative::findOrFail($validated['id']);
    
        $exists = SalesRepresentative::where('id', '!=', $representative->id)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return $this->errorResponse('Another representative with this name already exists', 409);
        }

        $oldValues = $representative->toArray();
        $representative->update($validated);

        TelescopeService::logOperation('UPDATE', 'sales_representatives', $representative->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroyRepresentative(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $representative = SalesRepresentative::findOrFail($id);
        $oldValues = $representative->toArray();
        $representative->delete();

        TelescopeService::logOperation('DELETE', 'sales_representatives', $id, $oldValues, null);

        return $this->successResponse();
    }

    public function ledger(Request $request): JsonResponse
    {
        $representativeId = $request->input('sales_representative_id');
        if (!$representativeId) {
            return $this->errorResponse('sales_representative_id is required', 400);
        }

        $representative = SalesRepresentative::findOrFail($representativeId);
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = SalesRepresentativeTransaction::where('sales_representative_id', $representativeId);

        if ($request->boolean('show_deleted')) {
             $query->where('is_deleted', true);
        } else {
             $query->where('is_deleted', false);
        }

        // Calculate amount from GeneralLedger where DEBITs equal the transaction volume
        $query->addSelect([
            'sales_representative_transactions.*',
            'amount' => GeneralLedger::selectRaw('SUM(amount)')
                ->whereColumn('voucher_number', 'sales_representative_transactions.voucher_number')
                ->where('entry_type', 'DEBIT')
                ->limit(1)
        ]);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%$search%")
                  ->orWhere('reference_id', 'like', "%$search%");
            });
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('transaction_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('transaction_date', '<=', $dateTo);
        }

        // Use a wrapper subquery or manual loop to get stats safely now that amount is dynamic
        $statsQuery = DB::table(
            DB::raw("({$query->toSql()}) as trans")
        )->mergeBindings($query->getQuery());

        $statsData = $statsQuery->selectRaw('
            SUM(CASE WHEN type = "commission" THEN amount ELSE 0 END) as total_commissions,
            SUM(CASE WHEN type IN ("payment", "return") THEN amount ELSE 0 END) as total_payments,
            SUM(CASE WHEN type = "return" THEN amount ELSE 0 END) as total_returns,
            COUNT(*) as transaction_count
        ')->first();

        $total = $query->count();
        $transactions = $query->with('createdBy')
            ->orderBy('transaction_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->successResponse([
            'representative' => [
                'id' => $representative->id,
                'name' => $representative->name,
                'current_balance' => (float)$representative->current_balance,
            ],
            'data' => SalesRepresentativeTransactionResource::collection($transactions),
            'stats' => [
                'total_commissions' => (float)($statsData->total_commissions ?? 0),
                'total_payments' => (float)($statsData->total_payments ?? 0),
                'total_returns' => (float)($statsData->total_returns ?? 0),
                'balance' => (float)$representative->current_balance,
                'transaction_count' => (int)($statsData->transaction_count ?? 0),
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_records' => $total,
                'total_pages' => ceil($total / $perPage),
            ],
        ]);
    }

    public function storeTransaction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sales_representative_id' => 'required|exists:sales_representatives,id',
            'type' => 'required|in:payment,adjustment',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        $ledgerService = app(LedgerService::class);
        $coaService = app(ChartOfAccountsMappingService::class);

        return DB::transaction(function () use ($validated, $ledgerService, $coaService) {
            $amount = (float)$validated['amount'];
            $glEntries = [];

            // Debit/Credit accounts depending on the type of transaction
            if ($validated['type'] === 'payment') {
                // If it's a payment TO the sales rep (reducing our liability/their balance)
                $glEntries[] = [
                    'account_code' => $coaService->getStandardAccounts()['sales_commission_expense'] ?? '5007', // Example commission exp or payable
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => $validated['description'] ?? 'Sales Representative Payment'
                ];
                $glEntries[] = [
                    'account_code' => $coaService->getStandardAccounts()['cash'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => $validated['description'] ?? 'Sales Representative Payment'
                ];
            } else {
                // Adjustments can be complex, default to miscellaneous expense vs cash/payable for now
                $glEntries[] = [
                    'account_code' => $coaService->getStandardAccounts()['sales_commission_expense'] ?? '5007',
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => $validated['description'] ?? 'Sales Representative Adjustment'
                ];
                $glEntries[] = [
                    'account_code' => $coaService->getStandardAccounts()['accounts_payable'] ?? '2001',
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => $validated['description'] ?? 'Sales Representative Adjustment'
                ];
            }

            // Post to Universal Journal / GL
            $voucherNumber = $ledgerService->postTransaction(
                $glEntries,
                'sales_representative_transactions',
                null,
                null,
                $validated['date'] ?? now()->format('Y-m-d'),
                'MANUAL'
            );

            // Record the transaction link
            $transaction = SalesRepresentativeTransaction::create([
                'sales_representative_id' => $validated['sales_representative_id'],
                'type' => $validated['type'],
                'voucher_number' => $voucherNumber,
                'description' => $validated['description'] ?? '',
                'transaction_date' => $validated['date'] ?? now(),
                'created_by' => auth()->id() ?? session('user_id'),
            ]);

            // Update balance
            $balanceChange = ($validated['type'] === 'payment') ? -$amount : $amount;
            
            SalesRepresentative::where('id', $validated['sales_representative_id'])
                ->increment('current_balance', $balanceChange);

            TelescopeService::logOperation('CREATE', 'sales_representative_transactions', $transaction->id, null, $validated);

            return $this->successResponse(['id' => $transaction->id, 'voucher_number' => $voucherNumber]);
        });
    }

    public function destroyTransaction(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $transaction = SalesRepresentativeTransaction::findOrFail($id);

        if ($transaction->type === 'commission' || $transaction->type === 'return') {
            return $this->errorResponse('Cannot delete commission or return transactions from here. Please use the Invoices module.', 400);
        }

        return DB::transaction(function () use ($transaction) {
            $balanceChange = $transaction->amount;
            
            SalesRepresentative::where('id', $transaction->sales_representative_id)
                ->increment('current_balance', $balanceChange);

            $transaction->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

            TelescopeService::logOperation('DELETE', 'sales_representative_transactions', $transaction->id, $transaction->toArray(), null);

            return $this->successResponse();
        });
    }
}
