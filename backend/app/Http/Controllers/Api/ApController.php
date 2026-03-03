<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApSupplier;
use App\Models\ApTransaction;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Resources\ApTransactionResource;

class ApController extends Controller
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

    /**
     * Get suppliers
     */
    public function suppliers(Request $request): JsonResponse
    {


        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $search = $request->input('search', '');

        $query = ApSupplier::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%")
                  ->orWhere('tax_number', 'like', "%$search%");
            });
        }

        $total = $query->count();
        $suppliers = $query->orderBy('name')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse(
            \App\Http\Resources\ApSupplierResource::collection($suppliers),
            $total,
            $page,
            $perPage
        );
    }

    /**
     * Create supplier
     */
    public function storeSupplier(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'payment_terms' => 'nullable|integer|min:0',
        ]);

        // Check for duplicates
        $exists = ApSupplier::where('name', $validated['name'])
            ->orWhere(function ($q) use ($validated) {
                if (!empty($validated['phone'])) {
                    $q->where('phone', $validated['phone']);
                }
            })
            ->exists();

        if ($exists) {
            return $this->errorResponse('Supplier with this name or phone already exists', 409);
        }

        $supplier = ApSupplier::create([
            ...$validated,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'ap_suppliers', $supplier->id, null, $validated);

        return $this->successResponse(['id' => $supplier->id]);
    }

    /**
     * Update supplier
     */
    public function updateSupplier(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:ap_suppliers,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
            'payment_terms' => 'nullable|integer|min:0',
        ]);

        $supplier = ApSupplier::findOrFail($validated['id']);
        $oldValues = $supplier->toArray();
        $supplier->update($validated);

        TelescopeService::logOperation('UPDATE', 'ap_suppliers', $supplier->id, $oldValues, $validated);

        return $this->successResponse();
    }

    /**
     * Delete supplier
     */
    public function destroySupplier(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $supplier = ApSupplier::findOrFail($id);

        // Check if supplier has outstanding balance
        if ($supplier->current_balance > 0) {
            return $this->errorResponse('Cannot delete supplier with outstanding balance', 400);
        }

        $oldValues = $supplier->toArray();
        $supplier->delete();

        TelescopeService::logOperation('DELETE', 'ap_suppliers', $id, $oldValues, null);

        return $this->successResponse();
    }

    /**
     * Get supplier ledger with aging — financial stats derived from GL.
     */
    public function supplierLedger(Request $request): JsonResponse
    {


        $supplierId = $request->input('supplier_id');
        
        if (!$supplierId) {
            return $this->errorResponse('supplier_id is required', 400);
        }

        $supplier = ApSupplier::findOrFail($supplierId);
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = ApTransaction::where('supplier_id', $supplierId);

        if ($request->boolean('show_deleted')) {
             $query->where('is_deleted', true);
        } else {
             $query->where('is_deleted', false);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%$search%")
                  ->orWhere('reference_id', 'like', "%$search%")
                  ->orWhere('voucher_number', 'like', "%$search%");
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

        // Financial stats derived from GL (single source of truth)
        $glStats = ['total_debit' => 0, 'total_credit' => 0, 'total_returns' => 0, 'total_payments' => 0];
        
        $apAccountId = ChartOfAccount::where('account_code', $this->coaService->getStandardAccounts()['accounts_payable'])->value('id');
        
        $invoiceVouchers = (clone $query)->where('type', 'invoice')->whereNotNull('voucher_number')->pluck('voucher_number')->toArray();
        $paymentVouchers = (clone $query)->where('type', 'payment')->whereNotNull('voucher_number')->pluck('voucher_number')->toArray();
        $returnVouchers = (clone $query)->where('type', 'return')->whereNotNull('voucher_number')->pluck('voucher_number')->toArray();

        if (!empty($invoiceVouchers) && $apAccountId) {
            $glStats['total_debit'] = (float) GeneralLedger::whereIn('voucher_number', $invoiceVouchers)
                ->where('account_id', $apAccountId)
                ->where('entry_type', 'CREDIT')
                ->sum('amount');
        }
        if (!empty($paymentVouchers) && $apAccountId) {
            $glStats['total_payments'] = (float) GeneralLedger::whereIn('voucher_number', $paymentVouchers)
                ->where('account_id', $apAccountId)
                ->where('entry_type', 'DEBIT')
                ->sum('amount');
            $glStats['total_credit'] += $glStats['total_payments'];
        }
        if (!empty($returnVouchers) && $apAccountId) {
            $glStats['total_returns'] = (float) GeneralLedger::whereIn('voucher_number', $returnVouchers)
                ->where('account_id', $apAccountId)
                ->where('entry_type', 'DEBIT')
                ->sum('amount');
            $glStats['total_credit'] += $glStats['total_returns'];
        }

        $total = $query->count();
        $transactions = $query->with('createdBy')
            ->orderBy('transaction_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        // Aging from GL: join AP transactions with GL amounts
        $today = now();
        $todayStr = $today->format('Y-m-d');
        $date30 = $today->copy()->subDays(30)->format('Y-m-d');
        $date60 = $today->copy()->subDays(60)->format('Y-m-d');
        $date90 = $today->copy()->subDays(90)->format('Y-m-d');

        // Get invoice vouchers with their dates for aging
        $invoiceTxns = ApTransaction::where('supplier_id', $supplierId)
            ->where('is_deleted', false)
            ->where('type', 'invoice')
            ->whereNotNull('voucher_number')
            ->get(['voucher_number', 'transaction_date']);

        $aging = ['current' => 0, '1_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0];
        foreach ($invoiceTxns as $txn) {
            $txnAmount = $apAccountId
                ? (float) GeneralLedger::where('voucher_number', $txn->voucher_number)
                    ->where('account_id', $apAccountId)
                    ->where('entry_type', 'CREDIT')
                    ->sum('amount')
                : 0;

            $txnDate = $txn->transaction_date->format('Y-m-d');
            if ($txnDate >= $todayStr) {
                $aging['current'] += $txnAmount;
            } elseif ($txnDate >= $date30) {
                $aging['1_30'] += $txnAmount;
            } elseif ($txnDate >= $date60) {
                $aging['31_60'] += $txnAmount;
            } elseif ($txnDate >= $date90) {
                $aging['61_90'] += $txnAmount;
            } else {
                $aging['over_90'] += $txnAmount;
            }
        }

        return $this->successResponse([
            'supplier' => [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'current_balance' => (float)$supplier->current_balance,
            ],
            'aging' => $aging,
            'data' => ApTransactionResource::collection($transactions),
            'stats' => [
                'total_debit' => $glStats['total_debit'],
                'total_credit' => $glStats['total_credit'],
                'total_returns' => $glStats['total_returns'],
                'total_payments' => $glStats['total_payments'],
                'balance' => (float)$supplier->current_balance,
                'transaction_count' => $total,
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_records' => $total,
                'total_pages' => ceil($total / $perPage),
            ],
        ]);
    }
}