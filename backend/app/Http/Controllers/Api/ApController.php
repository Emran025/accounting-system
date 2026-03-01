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
     * Get AP transactions
     */
    public function transactions(Request $request): JsonResponse
    {


        $supplierId = $request->input('supplier_id');
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = ApTransaction::with(['supplier', 'createdBy'])
            ->where('is_deleted', false);

        if ($supplierId) {
            $query->where('supplier_id', $supplierId);
        }

        $total = $query->count();
        $transactions = $query->orderBy('transaction_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse(
            \App\Http\Resources\ApTransactionResource::collection($transactions),
            $total,
            $page,
            $perPage
        );
    }

    /**
     * Create AP transaction — amount flows only to GL.
     */
    public function storeTransaction(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'supplier_id' => 'required|exists:ap_suppliers,id',
            'type' => 'required|in:invoice,payment,return',
            'amount' => 'required|numeric|min:0.01', // Accepted for GL posting only
            'description' => 'nullable|string',
            'reference_type' => 'nullable|string',
            'reference_id' => 'nullable|integer',
            'date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated) {
            $amount = $validated['amount']; // Used for GL only

            // GL Posting FIRST to get the voucher number
            $mappings = $this->coaService->getStandardAccounts();
            $glEntries = [];
            $supplier = ApSupplier::find($validated['supplier_id']);

            if ($validated['type'] === 'invoice') {
                $glEntries[] = [
                    'account_code' => $mappings['operating_expenses'],
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => "Invoice from supplier: {$supplier->name} - " . ($validated['description'] ?? '')
                ];
                $glEntries[] = [
                    'account_code' => $mappings['accounts_payable'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => "Invoice from supplier: {$supplier->name} (AP Update)"
                ];
            } elseif ($validated['type'] === 'payment') {
                $glEntries[] = [
                    'account_code' => $mappings['accounts_payable'],
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => "Payment to supplier: {$supplier->name} - " . ($validated['description'] ?? '')
                ];
                $glEntries[] = [
                    'account_code' => $mappings['cash'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => "Payment to supplier: {$supplier->name} (AP Update)"
                ];
            } else {
                $glEntries[] = [
                    'account_code' => $mappings['accounts_payable'],
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => "Return to supplier: {$supplier->name} (AP Update)"
                ];
                $glEntries[] = [
                    'account_code' => $mappings['operating_expenses'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => "Return to supplier: {$supplier->name} - " . ($validated['description'] ?? '')
                ];
            }

            $voucherNumber = $this->ledgerService->postTransaction(
                $glEntries,
                'ap_transactions',
                null, // Will update after creating record
                null,
                $validated['date'] ?? now()->format('Y-m-d')
            );

            // Create AP transaction (operational metadata only — NO amount)
            $transaction = ApTransaction::create([
                'supplier_id' => $validated['supplier_id'],
                'type' => $validated['type'],
                'voucher_number' => $voucherNumber, // Link to GL
                'description' => ($validated['description'] ?? '') . " [Voucher: $voucherNumber]",
                'reference_type' => $validated['reference_type'] ?? null,
                'reference_id' => $validated['reference_id'] ?? null,
                'transaction_date' => $validated['date'] ?? now(),
                'created_by' => auth()->id() ?? session('user_id'),
            ]);

            // Update GL reference_id
            GeneralLedger::where('voucher_number', $voucherNumber)
                ->where('reference_type', 'ap_transactions')
                ->update(['reference_id' => $transaction->id]);

            // Update supplier balance from GL
            $this->updateSupplierBalance($validated['supplier_id']);

            TelescopeService::logOperation('CREATE', 'ap_transactions', $transaction->id, null, $validated);

            return $this->successResponse(['id' => $transaction->id, 'voucher_number' => $voucherNumber]);
        });
    }

    /**
     * Record supplier payment — amount flows only to GL.
     */
    public function recordPayment(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'supplier_id' => 'required|exists:ap_suppliers,id',
            'amount' => 'required|numeric|min:0.01', // Accepted for GL posting only
            'payment_method' => 'nullable|in:cash,bank_transfer,check',
            'description' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated) {
            $amount = $validated['amount']; // Used for GL only

            // Post to GL FIRST
            $accounts = $this->coaService->getStandardAccounts();
            $voucherNumber = $this->ledgerService->getNextVoucherNumber('APP');

            $glEntries = [
                [
                    'account_code' => $accounts['accounts_payable'],
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => "Supplier payment - Voucher #$voucherNumber"
                ],
                [
                    'account_code' => $accounts['cash'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => "Supplier payment - Voucher #$voucherNumber"
                ],
            ];

            // Create payment transaction (operational metadata only — NO amount)
            $transaction = ApTransaction::create([
                'supplier_id' => $validated['supplier_id'],
                'type' => 'payment',
                'voucher_number' => $voucherNumber, // Link to GL
                'description' => $validated['description'] ?? 'Supplier payment',
                'transaction_date' => $validated['date'] ?? now(),
                'created_by' => auth()->id() ?? session('user_id'),
            ]);

            $this->ledgerService->postTransaction(
                $glEntries,
                'ap_transactions',
                $transaction->id,
                $voucherNumber,
                $validated['date'] ?? now()->format('Y-m-d')
            );

            // Update supplier balance from GL
            $this->updateSupplierBalance($validated['supplier_id']);

            TelescopeService::logOperation('CREATE', 'ap_transactions', $transaction->id, null, $validated);

            return $this->successResponse([
                'id' => $transaction->id,
                'voucher_number' => $voucherNumber,
            ]);
        });
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

    /**
     * Soft-delete AP transaction
     */
    public function destroyTransaction(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $transaction = ApTransaction::findOrFail($id);

        if ($transaction->type === 'invoice') {
            return $this->errorResponse('Cannot delete invoice transactions from here. Please use the Purchases module.', 400);
        }

        return DB::transaction(function () use ($transaction) {
            // Reverse GL entries
            if ($transaction->voucher_number) {
                $this->ledgerService->reverseTransaction($transaction->voucher_number, "Reversal of AP Transaction #{$transaction->id}");
            }

            // Soft delete
            $transaction->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

            // Update supplier balance from GL
            $this->updateSupplierBalance($transaction->supplier_id);

            TelescopeService::logOperation('DELETE', 'ap_transactions', $transaction->id, $transaction->toArray(), null);

            return $this->successResponse();
        });
    }

    /**
     * Update/restore AP transaction — amount derived from GL.
     */
    public function updateTransaction(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:ap_transactions,id',
            'restore' => 'nullable|boolean',
        ]);

        $transaction = ApTransaction::findOrFail($validated['id']);

        if ($transaction->type === 'invoice') {
            return $this->errorResponse('Cannot restore invoice transactions from here. Please use the Purchases module.', 400);
        }

        if ($validated['restore'] ?? false) {
            return DB::transaction(function () use ($transaction) {
                if (!$transaction->is_deleted) {
                    return $this->errorResponse('Transaction is not deleted', 400);
                }

                // Get amount from original GL entries
                $amount = 0;
                if ($transaction->voucher_number) {
                    $amount = (float) GeneralLedger::where('voucher_number', $transaction->voucher_number)
                        ->where('entry_type', 'DEBIT')
                        ->sum('amount') / max(1, GeneralLedger::where('voucher_number', $transaction->voucher_number)->where('entry_type', 'DEBIT')->count());
                }

                if ($amount <= 0) {
                    return $this->errorResponse('Cannot determine original amount from GL', 400);
                }

                // Trigger NEW GL Posting
                $mappings = $this->coaService->getStandardAccounts();
                $glEntries = [];
                $supplier = ApSupplier::find($transaction->supplier_id);

                if ($transaction->type === 'payment') {
                    $glEntries[] = [
                        'account_code' => $mappings['accounts_payable'],
                        'entry_type' => 'DEBIT',
                        'amount' => $amount,
                        'description' => "Restored Payment to: {$supplier->name} [Original ID: {$transaction->id}]"
                    ];
                    $glEntries[] = [
                        'account_code' => $mappings['cash'],
                        'entry_type' => 'CREDIT',
                        'amount' => $amount,
                        'description' => "Restored Payment to: {$supplier->name} (AP Reference)"
                    ];
                } else {
                    $glEntries[] = [
                        'account_code' => $mappings['accounts_payable'],
                        'entry_type' => 'DEBIT',
                        'amount' => $amount,
                        'description' => "Restored Return to: {$supplier->name} [Original ID: {$transaction->id}]"
                    ];
                    $glEntries[] = [
                        'account_code' => $mappings['operating_expenses'],
                        'entry_type' => 'CREDIT',
                        'amount' => $amount,
                        'description' => "Restored Return to: {$supplier->name} (AP Reference)"
                    ];
                }

                $newVoucher = $this->ledgerService->postTransaction(
                    $glEntries,
                    'ap_transactions',
                    $transaction->id,
                    null,
                    now()->format('Y-m-d')
                );

                $transaction->update([
                    'is_deleted' => false,
                    'deleted_at' => null,
                    'voucher_number' => $newVoucher, // Update to new voucher
                ]);

                // Update supplier balance from GL
                $this->updateSupplierBalance($transaction->supplier_id);

                TelescopeService::logOperation('RESTORE', 'ap_transactions', $transaction->id, ['is_deleted' => true], ['is_deleted' => false]);

                return $this->successResponse(['status' => 'restored', 'voucher_number' => $newVoucher]);
            });
        }

        return $this->successResponse();
    }

    /**
     * Update supplier balance — derived from GL (single source of truth).
     * Calculates the net AP balance from GL entries referencing this supplier's transactions.
     */
    private function updateSupplierBalance(int $supplierId): void
    {
        $apAccountId = ChartOfAccount::where('account_code', $this->coaService->getStandardAccounts()['accounts_payable'])->value('id');

        if (!$apAccountId) {
            return;
        }

        // Get all active voucher numbers for this supplier
        $voucherNumbers = ApTransaction::where('supplier_id', $supplierId)
            ->where('is_deleted', false)
            ->whereNotNull('voucher_number')
            ->pluck('voucher_number')
            ->toArray();

        if (empty($voucherNumbers)) {
            ApSupplier::where('id', $supplierId)->update(['current_balance' => 0]);
            return;
        }

        // Balance = Credits to AP (invoices) - Debits to AP (payments/returns)
        $credits = (float) GeneralLedger::whereIn('voucher_number', $voucherNumbers)
            ->where('account_id', $apAccountId)
            ->where('entry_type', 'CREDIT')
            ->sum('amount');

        $debits = (float) GeneralLedger::whereIn('voucher_number', $voucherNumbers)
            ->where('account_id', $apAccountId)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');

        $balance = $credits - $debits;

        ApSupplier::where('id', $supplierId)->update([
            'current_balance' => $balance
        ]);
    }
}
