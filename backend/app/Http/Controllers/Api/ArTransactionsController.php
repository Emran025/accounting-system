<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArCustomer;
use App\Models\ArTransaction;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use App\Http\Resources\ArTransactionResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Services\PermissionService;

/**
 * AR Transactions Controller — Financial transactions for Accounts Receivable.
 * Amounts are derived from the General Ledger (Single Source of Truth).
 */
class ArTransactionsController extends Controller
{
    use BaseApiController;

    protected LedgerService $ledgerService;
    protected ChartOfAccountsMappingService $coaService;

    public function __construct(LedgerService $ledgerService, ChartOfAccountsMappingService $coaService)
    {
        $this->ledgerService = $ledgerService;
        $this->coaService = $coaService;
    }

    /**
     * List AR transactions.
     */
    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('invoices', 'view');

        $query = ArTransaction::with(['customer', 'createdBy'])
            ->when($request->customer_id, fn($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->orderByDesc('transaction_date');

        $transactions = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => ArTransactionResource::collection($transactions),
            'pagination' => [
                'total_records' => $transactions->total(),
                'current_page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'total_pages' => $transactions->lastPage(),
            ],
        ]);
    }

    /**
     * Store a new AR transaction (e.g. Manual Receipt/Return).
     * Note: Invoices are usually created through SalesService.
     */
    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('invoices', 'create');

        $validated = $request->validate([
            'customer_id' => 'required|exists:ar_customers,id',
            'type' => 'required|in:payment,receipt,return',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated) {
            $amount = $validated['amount'];
            $mappings = $this->coaService->getStandardAccounts();
            $glEntries = [];
            $customer = ArCustomer::find($validated['customer_id']);

            if ($validated['type'] === 'payment' || $validated['type'] === 'receipt') {
                // Payment/Receipt Received: Debit Cash, Credit AR
                $glEntries[] = [
                    'account_code' => $mappings['cash'],
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => "Receipt from customer: {$customer->name} - " . ($validated['description'] ?? '')
                ];
                $glEntries[] = [
                    'account_code' => $mappings['accounts_receivable'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => "Receipt from customer: {$customer->name} (AR Update)"
                ];
            } else {
                // Return: Debit Sales Revenue, Credit AR
                $glEntries[] = [
                    'account_code' => $mappings['sales_revenue'],
                    'entry_type' => 'DEBIT',
                    'amount' => $amount,
                    'description' => "Return from customer: {$customer->name} - " . ($validated['description'] ?? '')
                ];
                $glEntries[] = [
                    'account_code' => $mappings['accounts_receivable'],
                    'entry_type' => 'CREDIT',
                    'amount' => $amount,
                    'description' => "Return from customer: {$customer->name} (AR Update)"
                ];
            }

            $voucherNumber = $this->ledgerService->postTransaction(
                $glEntries,
                'ar_transactions',
                null,
                null,
                $validated['date'] ?? now()->format('Y-m-d')
            );

            // Create AR transaction
            $transaction = ArTransaction::create([
                'customer_id' => $validated['customer_id'],
                'type' => $validated['type'],
                'voucher_number' => $voucherNumber,
                'description' => ($validated['description'] ?? '') . " [Voucher: $voucherNumber]",
                'transaction_date' => $validated['date'] ?? now(),
                'created_by' => auth()->id() ?? session('user_id'),
            ]);

            // Reference back to transaction in GL
            GeneralLedger::where('voucher_number', $voucherNumber)
                ->where('reference_type', 'ar_transactions')
                ->update(['reference_id' => $transaction->id]);

            // Update balance
            $this->updateCustomerBalance($validated['customer_id']);

            return response()->json([
                'success' => true,
                'message' => 'AR Transaction recorded successfully.',
                'data' => new ArTransactionResource($transaction),
            ]);
        });
    }

    /**
     * Void/Delete an AR transaction.
     */
    public function destroy(int $id): JsonResponse
    {
        PermissionService::requirePermission('invoices', 'delete');

        $transaction = ArTransaction::findOrFail($id);

        if ($transaction->type === 'invoice') {
            return $this->errorResponse('Cannot delete invoice transactions from here. Please use the Invoices module.', 400);
        }

        return DB::transaction(function () use ($transaction) {
            // Reverse GL entries
            if ($transaction->voucher_number) {
                $this->ledgerService->reverseTransaction($transaction->voucher_number, "Reversal of AR Transaction #{$transaction->id}");
            }

            // Soft delete
            $transaction->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

            // Update balance
            $this->updateCustomerBalance($transaction->customer_id);

            return $this->successResponse();
        });
    }

    /**
     * Update/Sync customer balance from General Ledger.
     */
    private function updateCustomerBalance(int $customerId): void
    {
        $customer = ArCustomer::findOrFail($customerId);
        $accounts = $this->coaService->getStandardAccounts();
        $arAccountId = ChartOfAccount::where('account_code', $accounts['accounts_receivable'])->value('id');

        // Net balance = Total Invoices (Debits) - Total Receipts/Returns (Credits)
        $vouchers = ArTransaction::where('customer_id', $customerId)
            ->where('is_deleted', false)
            ->whereNotNull('voucher_number')
            ->pluck('voucher_number')
            ->toArray();

        $debits = GeneralLedger::whereIn('voucher_number', $vouchers)
            ->where('account_id', $arAccountId)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');

        $credits = GeneralLedger::whereIn('voucher_number', $vouchers)
            ->where('account_id', $arAccountId)
            ->where('entry_type', 'CREDIT')
            ->sum('amount');

        $customer->update(['current_balance' => $debits - $credits]);
    }
}
