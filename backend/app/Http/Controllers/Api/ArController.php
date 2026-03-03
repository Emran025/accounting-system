<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArCustomer;
use App\Models\ArTransaction;
use App\Models\GeneralLedger;
use App\Models\ChartOfAccount;
use App\Services\TelescopeService;
use App\Http\Requests\StoreArCustomerRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
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

    /**
     * Customer ledger — financial stats derived from GL (single source of truth).
     */
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
        $voucherNumbers = (clone $query)->whereNotNull('voucher_number')->pluck('voucher_number')->toArray();

        $glStats = ['total_debit' => 0, 'total_credit' => 0, 'total_returns' => 0, 'total_receipts' => 0];
        
        $accounts = $this->coaService->getStandardAccounts();
        $arAccountId = ChartOfAccount::where('account_code', $accounts['accounts_receivable'])->value('id');

        if (!empty($voucherNumbers) && $arAccountId) {
            // Invoices (increase AR balance via DEBIT)
            $invoiceVouchers = (clone $query)->where('type', 'invoice')->pluck('voucher_number')->toArray();
            if (!empty($invoiceVouchers)) {
                $glStats['total_debit'] = (float) GeneralLedger::whereIn('voucher_number', $invoiceVouchers)
                    ->where('account_id', $arAccountId)
                    ->where('entry_type', 'DEBIT')
                    ->sum('amount');
            }

            // Receipts/Payments (decrease AR balance via CREDIT)
            $receiptVouchers = (clone $query)->whereIn('type', ['payment', 'receipt'])->pluck('voucher_number')->toArray();
            if (!empty($receiptVouchers)) {
                $glStats['total_receipts'] = (float) GeneralLedger::whereIn('voucher_number', $receiptVouchers)
                    ->where('account_id', $arAccountId)
                    ->where('entry_type', 'CREDIT')
                    ->sum('amount');
            }

            // Returns (decrease AR balance via CREDIT)
            $returnVouchers = (clone $query)->where('type', 'return')->pluck('voucher_number')->toArray();
            if (!empty($returnVouchers)) {
                $glStats['total_returns'] = (float) GeneralLedger::whereIn('voucher_number', $returnVouchers)
                    ->where('account_id', $arAccountId)
                    ->where('entry_type', 'CREDIT')
                    ->sum('amount');
            }

            $glStats['total_credit'] = $glStats['total_receipts'] + $glStats['total_returns'];
        }

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
                'total_debit' => $glStats['total_debit'],
                'total_credit' => $glStats['total_credit'],
                'total_returns' => $glStats['total_returns'],
                'total_receipts' => $glStats['total_receipts'],
                'balance' => (float)$customer->current_balance,
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
