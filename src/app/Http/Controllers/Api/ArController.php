<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArCustomer;
use App\Models\ArTransaction;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Http\Requests\StoreArCustomerRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Resources\ArTransactionResource;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;

class ArController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;
    private ChartOfAccountsMappingService $coaService;

    public function __construct(LedgerService $ledgerService, ChartOfAccountsMappingService $coaService)
    {
        $this->ledgerService = $ledgerService;
        $this->coaService = $coaService;
    }

    public function customers(Request $request): JsonResponse
    {


        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $search = $request->input('search', '');

        $query = ArCustomer::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%")
                  ->orWhere('tax_number', 'like', "%$search%");
            });
        }

        $total = $query->count();
        $customers = $query->orderBy('name')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->withSum(['invoices as total_debt' => function ($query) {
                $query->where('payment_type', 'credit');
            }], 'total_amount')
            ->get()
            ->map(function ($customer) {
                $customer->total_debt = $customer->total_debt ?? 0;
                $customer->total_paid = max(0, $customer->total_debt - $customer->current_balance);
                return $customer;
            });

        return $this->paginatedResponse(
            \App\Http\Resources\ArCustomerResource::collection($customers),
            $total,
            $page,
            $perPage
        );
    }

    public function storeCustomer(StoreArCustomerRequest $request): JsonResponse
    {


        $validated = $request->validated();

        // Check for duplicates
        $exists = ArCustomer::where(function ($query) use ($validated) {
            $query->where('name', $validated['name']);
            if (!empty($validated['phone'])) {
                $query->orWhere('phone', $validated['phone']);
            }
        })->exists();

        if ($exists) {
            return $this->errorResponse('Customer with this name or phone already exists', 409);
        }

        $customer = ArCustomer::create([
            ...$validated,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'ar_customers', $customer->id, null, $validated);

        return $this->successResponse(['id' => $customer->id]);
    }

    public function updateCustomer(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:ar_customers,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string|max:50',
        ]);

        $customer = ArCustomer::findOrFail($validated['id']);
    
        // Check for duplicates (excluding self)
        $exists = ArCustomer::where('id', '!=', $customer->id)
            ->where(function ($query) use ($validated) {
                $query->where('name', $validated['name']);
                if (!empty($validated['phone'])) {
                    $query->orWhere('phone', $validated['phone']);
                }
            })
            ->exists();

        if ($exists) {
            return $this->errorResponse('Another customer with this name or phone already exists', 409);
        }

        $oldValues = $customer->toArray();
        $customer->update($validated);

        TelescopeService::logOperation('UPDATE', 'ar_customers', $customer->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroyCustomer(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $customer = ArCustomer::findOrFail($id);
        $oldValues = $customer->toArray();
        $customer->delete();

        TelescopeService::logOperation('DELETE', 'ar_customers', $id, $oldValues, null);

        return $this->successResponse();
    }

    public function ledger(Request $request): JsonResponse
    {


        $customerId = $request->input('customer_id');
        if (!$customerId) {
            return $this->errorResponse('customer_id is required', 400);
        }

        $customer = ArCustomer::findOrFail($customerId);
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = ArTransaction::where('customer_id', $customerId);

        if ($request->boolean('show_deleted')) {
             $query->where('is_deleted', true);
        } else {
             $query->where('is_deleted', false);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%$search%")
                  ->orWhere('reference_id', 'like', "%$search%")
                  ->orWhere('amount', 'like', "%$search%");
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

        // Stats calculation
        $statsData = (clone $query)->selectRaw('
            SUM(CASE WHEN type = "invoice" THEN amount ELSE 0 END) as total_debit,
            SUM(CASE WHEN type IN ("payment", "receipt", "return") THEN amount ELSE 0 END) as total_credit,
            SUM(CASE WHEN type = "return" THEN amount ELSE 0 END) as total_returns,
            SUM(CASE WHEN type IN ("payment", "receipt") THEN amount ELSE 0 END) as total_receipts,
            COUNT(*) as transaction_count
        ')->first();

        $total = $query->count();
        $transactions = $query->with('createdBy')
            ->orderBy('transaction_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->successResponse([
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'current_balance' => (float)$customer->current_balance,
            ],
            'data' => ArTransactionResource::collection($transactions),
            'stats' => [
                'total_debit' => (float)($statsData->total_debit ?? 0),
                'total_credit' => (float)($statsData->total_credit ?? 0),
                'total_returns' => (float)($statsData->total_returns ?? 0),
                'total_receipts' => (float)($statsData->total_receipts ?? 0),
                'balance' => (float)$customer->current_balance,
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
            'customer_id' => 'required|exists:ar_customers,id',
            'type' => 'required|in:payment,receipt,return',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated) {
            $transaction = ArTransaction::create([
                'customer_id' => $validated['customer_id'],
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'description' => $validated['description'] ?? '',
                'transaction_date' => $validated['date'] ?? now(),
                'created_by' => auth()->id() ?? session('user_id'),
            ]);

            // Update customer balance: Both payments/receipts and returns reduce the customer's debt
            $balanceChange = -$validated['amount'];
            
            ArCustomer::where('id', $validated['customer_id'])
                ->increment('current_balance', $balanceChange);

            // GL Posting
            $mappings = $this->coaService->getStandardAccounts();
            $glEntries = [];
            $customer = ArCustomer::find($validated['customer_id']);

            if ($validated['type'] === 'payment' || $validated['type'] === 'receipt') {
                // Payment/Receipt Received: Debit Cash, Credit AR
                $glEntries[] = [
                    'account_code' => $mappings['cash'],
                    'entry_type' => 'DEBIT',
                    'amount' => $validated['amount'],
                    'description' => "Receipt from customer: {$customer->name} - " . ($validated['description'] ?? '')
                ];
                $glEntries[] = [
                    'account_code' => $mappings['accounts_receivable'],
                    'entry_type' => 'CREDIT',
                    'amount' => $validated['amount'],
                    'description' => "Receipt from customer: {$customer->name} (AR Update)"
                ];
            } else {
                // Return: Debit Sales Revenue (or Sales Return), Credit AR
                $glEntries[] = [
                    'account_code' => $mappings['sales_revenue'], // Simplified, usually a specific Sales Return account
                    'entry_type' => 'DEBIT',
                    'amount' => $validated['amount'],
                    'description' => "Return from customer: {$customer->name} - " . ($validated['description'] ?? '')
                ];
                $glEntries[] = [
                    'account_code' => $mappings['accounts_receivable'],
                    'entry_type' => 'CREDIT',
                    'amount' => $validated['amount'],
                    'description' => "Return from customer: {$customer->name} (AR Update)"
                ];
            }

            $voucherNumber = $this->ledgerService->postTransaction(
                $glEntries,
                'ar_transactions',
                $transaction->id,
                null,
                $validated['date'] ?? now()->format('Y-m-d')
            );

            $transaction->update(['description' => ($validated['description'] ?? '') . " [Voucher: $voucherNumber]"]);

            TelescopeService::logOperation('CREATE', 'ar_transactions', $transaction->id, null, $validated);

            return $this->successResponse(['id' => $transaction->id, 'voucher_number' => $voucherNumber]);
        });
    }

    public function destroyTransaction(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $transaction = ArTransaction::findOrFail($id);

        if ($transaction->type === 'invoice') {
            return $this->errorResponse('Cannot delete invoice transactions from here. Please use the Invoices module.', 400);
        }

        return DB::transaction(function () use ($transaction) {
            // Reverse balance change: Both payments/receipts and returns previously reduced debt,
            // so deleting either should increase the debt (increment current_balance).
            $balanceChange = $transaction->amount;
            
            ArCustomer::where('id', $transaction->customer_id)
                ->increment('current_balance', $balanceChange);

            // Reverse GL entries
            $voucherNumber = \App\Models\GeneralLedger::where('reference_type', 'ar_transactions')
                ->where('reference_id', $transaction->id)
                ->value('voucher_number');
            
            if ($voucherNumber) {
                $this->ledgerService->reverseTransaction($voucherNumber, "Reversal of AR Transaction #{$transaction->id}");
            }

            // Soft delete
            $transaction->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

            TelescopeService::logOperation('DELETE', 'ar_transactions', $transaction->id, $transaction->toArray(), null);

            return $this->successResponse();
        });
    }

    public function updateTransaction(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:ar_transactions,id',
            'restore' => 'nullable|boolean',
        ]);

        $transaction = ArTransaction::findOrFail($validated['id']);

        if ($transaction->type === 'invoice') {
            return $this->errorResponse('Cannot restore invoice transactions from here. Please use the Invoices module.', 400);
        }

        if ($validated['restore'] ?? false) {
            return DB::transaction(function () use ($transaction) {
                if (!$transaction->is_deleted) {
                    return $this->errorResponse('Transaction is not deleted', 400);
                }

                // Restore transaction balance impact: Both payments/receipts and returns reduce debt.
                $balanceChange = -$transaction->amount;
            
                ArCustomer::where('id', $transaction->customer_id)
                    ->increment('current_balance', $balanceChange);

                // Trigger NEW GL Posting to recognize the movement again
                $mappings = $this->coaService->getStandardAccounts();
                $glEntries = [];
                $customer = ArCustomer::find($transaction->customer_id);

                if ($transaction->type === 'payment' || $transaction->type === 'receipt') {
                    $glEntries[] = [
                        'account_code' => $mappings['cash'],
                        'entry_type' => 'DEBIT',
                        'amount' => $transaction->amount,
                        'description' => "Restored Receipt from: {$customer->name} [Original ID: {$transaction->id}]"
                    ];
                    $glEntries[] = [
                        'account_code' => $mappings['accounts_receivable'],
                        'entry_type' => 'CREDIT',
                        'amount' => $transaction->amount,
                        'description' => "Restored Receipt from: {$customer->name} (AR Reference)"
                    ];
                } else {
                    $glEntries[] = [
                        'account_code' => $mappings['sales_revenue'],
                        'entry_type' => 'DEBIT',
                        'amount' => $transaction->amount,
                        'description' => "Restored Return from: {$customer->name} [Original ID: {$transaction->id}]"
                    ];
                    $glEntries[] = [
                        'account_code' => $mappings['accounts_receivable'],
                        'entry_type' => 'CREDIT',
                        'amount' => $transaction->amount,
                        'description' => "Restored Return from: {$customer->name} (AR Reference)"
                    ];
                }

                $this->ledgerService->postTransaction(
                    $glEntries,
                    'ar_transactions',
                    $transaction->id,
                    null,
                    now()->format('Y-m-d')
                );

                $transaction->update([
                    'is_deleted' => false,
                    'deleted_at' => null,
                ]);

                TelescopeService::logOperation('RESTORE', 'ar_transactions', $transaction->id, ['is_deleted' => true], ['is_deleted' => false]);

                return $this->successResponse(['status' => 'restored']);
            });
        }

        return $this->successResponse();
    }

    public function receipts(Request $request): JsonResponse
    {
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = ArTransaction::whereIn('type', ['receipt', 'payment'])
            ->with(['customer', 'createdBy']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%$search%")
                  ->orWhere('amount', 'like', "%$search%")
                  ->orWhereHas('customer', function($c) use ($search) {
                      $c->where('name', 'like', "%$search%");
                  });
            });
        }

        $total = $query->count();
        $transactions = $query->orderBy('transaction_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->successResponse([
            'data' => ArTransactionResource::collection($transactions),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_records' => $total,
                'total_pages' => ceil($total / $perPage),
            ],
        ]);
    }
}
