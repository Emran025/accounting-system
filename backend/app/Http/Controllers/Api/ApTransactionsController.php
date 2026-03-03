<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApSupplier;
use App\Models\ApTransaction;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use App\Http\Resources\ApTransactionResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Services\PermissionService;

/**
 * AP Transactions Controller — Financial transactions for Accounts Payable.
 * Amounts are derived from the General Ledger (Single Source of Truth).
 */
class ApTransactionsController extends Controller
{
    protected LedgerService $ledgerService;
    protected ChartOfAccountsMappingService $coaService;

    public function __construct(LedgerService $ledgerService, ChartOfAccountsMappingService $coaService)
    {
        $this->ledgerService = $ledgerService;
        $this->coaService = $coaService;
    }

    /**
     * List AP transactions.
     */
    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'view');

        $query = ApTransaction::with(['supplier', 'createdBy'])
            ->when($request->supplier_id, fn($q) => $q->where('supplier_id', $request->supplier_id))
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->orderByDesc('transaction_date');

        $transactions = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => ApTransactionResource::collection($transactions),
            'pagination' => [
                'total_records' => $transactions->total(),
                'current_page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'total_pages' => $transactions->lastPage(),
            ],
        ]);
    }

    /**
     * Store a new AP transaction (e.g. Manual Invoice).
     */
    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'create');

        $request->validate([
            'supplier_id' => 'required|exists:ap_suppliers,id',
            'type' => 'required|in:invoice,payment,return,adjustment',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'description' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($request) {
            $accounts = $this->coaService->getStandardAccounts();
            $voucherNumber = $this->ledgerService->getNextVoucherNumber('AP-INV');

            // 1. Post to GL
            // For an AP Invoice: Debit Expense, Credit AP
            $entries = [
                ['account_code' => $accounts['operating_expenses'], 'entry_type' => 'DEBIT', 'amount' => $request->amount],
                ['account_code' => $accounts['accounts_payable'], 'entry_type' => 'CREDIT', 'amount' => $request->amount],
            ];

            $this->ledgerService->postTransaction(
                $entries,
                'ap_transactions',
                null, // ID updated after creation
                $voucherNumber,
                $request->date,
                'AUTOMATIC'
            );

            // 2. Create AP Transaction record (Operational Metadata)
            $transaction = ApTransaction::create([
                'supplier_id' => $request->supplier_id,
                'type' => $request->type,
                'transaction_date' => $request->date,
                'voucher_number' => $voucherNumber,
                'description' => $request->description,
                'created_by' => auth()->id(),
            ]);

            // 3. Update supplier balance (Derived from GL)
            $this->updateSupplierBalance($request->supplier_id);

            return response()->json([
                'success' => true,
                'message' => 'AP Transaction recorded successfully.',
                'data' => new ApTransactionResource($transaction),
            ]);
        });
    }

    /**
     * Record a supplier payment.
     */
    public function recordPayment(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'create');

        $request->validate([
            'supplier_id' => 'required|exists:ap_suppliers,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,bank,check',
            'date' => 'required|date',
            'reference' => 'nullable|string|max:100',
        ]);

        return DB::transaction(function () use ($request) {
            $accounts = $this->coaService->getStandardAccounts();
            $voucherNumber = $this->ledgerService->getNextVoucherNumber('AP-PAY');

            // 1. Post to GL
            // For a Payment: Debit AP, Credit Cash/Bank
            $entries = [
                ['account_code' => $accounts['accounts_payable'], 'entry_type' => 'DEBIT', 'amount' => $request->amount],
                ['account_code' => $accounts['cash'], 'entry_type' => 'CREDIT', 'amount' => $request->amount],
            ];

            $this->ledgerService->postTransaction(
                $entries,
                'ap_transactions',
                null,
                $voucherNumber,
                $request->date,
                'AUTOMATIC'
            );

            // 2. Create AP Transaction (Operational Metadata)
            $transaction = ApTransaction::create([
                'supplier_id' => $request->supplier_id,
                'type' => 'payment',
                'transaction_date' => $request->date,
                'voucher_number' => $voucherNumber,
                'description' => "Payment via " . $request->payment_method . ($request->reference ? " (Ref: {$request->reference})" : ""),
                'created_by' => auth()->id(),
            ]);

            // 3. Update supplier balance
            $this->updateSupplierBalance($request->supplier_id);

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully.',
                'data' => new ApTransactionResource($transaction),
            ]);
        });
    }

    /**
     * Void/Delete an AP transaction.
     */
    public function destroy(int $id): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'delete');

        $transaction = ApTransaction::findOrFail($id);
        
        if ($transaction->type === 'invoice' && $transaction->reference_type === 'purchases') {
            return response()->json([
                'success' => false,
                'message' => 'Purchase invoices must be voided from the Purchases module.',
            ], 403);
        }

        return DB::transaction(function () use ($transaction) {
            // 1. Reverse GL impact
            if ($transaction->voucher_number) {
                $this->ledgerService->reverseTransaction($transaction->voucher_number, "Voided AP Transaction #{$transaction->id}");
            }

            // 2. Mark as deleted
            $transaction->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

            // 3. Sync balance
            $this->updateSupplierBalance($transaction->supplier_id);

            return response()->json([
                'success' => true,
                'message' => 'Transaction voided successfully.',
            ]);
        });
    }

    /**
     * Update an AP transaction.
     */
    public function update(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'edit');

        $request->validate([
            'id' => 'required|exists:ap_transactions,id',
            'description' => 'nullable|string|max:500',
            'transaction_date' => 'nullable|date',
            'is_deleted' => 'nullable|boolean',
        ]);

        $transaction = ApTransaction::findOrFail($request->id);

        return DB::transaction(function () use ($request, $transaction) {
            // Restore logic if is_deleted changed from true to false
            if ($transaction->is_deleted && $request->is_deleted === false) {
                // Restore GL entries if they were reversed
                // In this system, reversal creates NEW entries. 
                // Restoring means we might need to RE-POST.
                if ($transaction->type !== 'invoice' || $transaction->reference_type !== 'purchases') {
                    // Re-calculate and re-post (simplified for now)
                    // Better: just allow partial description updates.
                }
            }

            $transaction->update($request->only(['description', 'transaction_date', 'is_deleted']));

            if ($request->has('is_deleted')) {
                $this->updateSupplierBalance($transaction->supplier_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Transaction updated successfully.',
                'data' => new ApTransactionResource($transaction),
            ]);
        });
    }

    /**
     * Update/Sync supplier balance from General Ledger.
     */
    private function updateSupplierBalance(int $supplierId): void
    {
        $supplier = ApSupplier::findOrFail($supplierId);
        
        // Net balance = Sum of DEBITs - Sum of CREDITs for AP account referencing this supplier
        // Actually for AP: Balance = Credits (Invoices) - Debits (Payments)
        $accounts = $this->coaService->getStandardAccounts();
        $apAccountId = ChartOfAccount::where('account_code', $accounts['accounts_payable'])->value('id');

        // Get all voucher numbers for this supplier
        $vouchers = ApTransaction::where('supplier_id', $supplierId)
            ->where('is_deleted', false)
            ->whereNotNull('voucher_number')
            ->pluck('voucher_number')
            ->toArray();

        $credits = GeneralLedger::whereIn('voucher_number', $vouchers)
            ->where('account_id', $apAccountId)
            ->where('entry_type', 'CREDIT')
            ->sum('amount');

        $debits = GeneralLedger::whereIn('voucher_number', $vouchers)
            ->where('account_id', $apAccountId)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');

        $supplier->update(['current_balance' => $credits - $debits]);
    }
}
