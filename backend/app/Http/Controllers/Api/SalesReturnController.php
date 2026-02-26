<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SalesService;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Models\SalesReturn;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class SalesReturnController extends Controller
{
    use BaseApiController;
    
    private SalesService $salesService;

    public function __construct(SalesService $salesService)
    {
        $this->salesService = $salesService;
    }

    /**
     * List all sales returns with pagination
     */
    public function index(Request $request): JsonResponse
    {


        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $invoiceId = $request->input('invoice_id');

        $query = SalesReturn::with(['invoice', 'user', 'items.product'])
            ->withCount('items');

        if ($invoiceId) {
            $query->where('invoice_id', $invoiceId);
        }

        $total = $query->count();
        $returns = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse(
            $returns,
            $total,
            $page,
            $perPage
        );
    }

    /**
     * Create a new sales return
     */
    public function store(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'items' => 'required|array|min:1',
            'items.*.invoice_item_id' => 'required|exists:invoice_items,id',
            'items.*.return_quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $userId = auth()->id() ?? session('user_id');
            if (!$userId) {
                return $this->errorResponse('User ID is required', 401);
            }

            $returnId = $this->salesService->createReturn(
                $validated['invoice_id'],
                $validated['items'],
                $validated['reason'] ?? null,
                $userId
            );

            TelescopeService::logOperation('CREATE', 'sales_returns', $returnId, null, $validated);

            return $this->successResponse(['id' => $returnId], 'تم إنشاء المرتجع بنجاح');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Sales Return Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Get a single return with details
     */
    public function show(Request $request): JsonResponse
    {


        $id = $request->input('id');
        if (!$id) {
            return $this->errorResponse('Return ID is required', 400);
        }

        $return = SalesReturn::with(['invoice.customer', 'user', 'items.product'])
            ->withCount('items')
            ->findOrFail($id);

        return $this->successResponse($return);
    }

    /**
     * Unified returns ledger – all sales returns (cash + credit) across all customers.
     * Response structure mirrors the AR ledger for a consistent frontend experience.
     */
    public function ledger(Request $request): JsonResponse
    {
        $page    = max(1, (int) $request->input('page', 1));
        $perPage = min(100, max(1, (int) $request->input('per_page', 20)));
        $offset  = ($page - 1) * $perPage;

        // Build base query on sales_returns joined with invoices & customers
        $query = SalesReturn::with(['invoice.customer', 'user', 'items.product'])
            ->join('invoices', 'sales_returns.invoice_id', '=', 'invoices.id')
            ->leftJoin('ar_customers', 'invoices.customer_id', '=', 'ar_customers.id')
            ->select(
                'sales_returns.*',
                'invoices.invoice_number',
                'invoices.payment_type',
                'invoices.customer_id',
                'ar_customers.name as customer_name'
            );

        // Search: by description (reason), return_number, invoice_number, or customer name
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('sales_returns.reason', 'like', "%{$search}%")
                  ->orWhere('sales_returns.return_number', 'like', "%{$search}%")
                  ->orWhere('invoices.invoice_number', 'like', "%{$search}%")
                  ->orWhere('ar_customers.name', 'like', "%{$search}%")
                  ->orWhere('sales_returns.total_amount', 'like', "%{$search}%");
            });
        }

        // Payment-type filter (maps to the original invoice's payment_type: cash / credit)
        if ($type = $request->input('type')) {
            $query->where('invoices.payment_type', $type);
        }

        // Date range filter
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('sales_returns.created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('sales_returns.created_at', '<=', $dateTo);
        }

        // Stats (computed before pagination)
        $statsData = (clone $query)->selectRaw('
            COUNT(*) as transaction_count,
            SUM(sales_returns.total_amount) as total_returns,
            SUM(CASE WHEN invoices.payment_type = "cash"   THEN sales_returns.total_amount ELSE 0 END) as total_cash_returns,
            SUM(CASE WHEN invoices.payment_type = "credit" THEN sales_returns.total_amount ELSE 0 END) as total_credit_returns
        ')->first();

        $total   = $query->count();
        $returns = $query
            ->orderBy('sales_returns.created_at', 'desc')
            ->skip($offset)
            ->take($perPage)
            ->get();

        // Map to a ledger-compatible shape
        $data = $returns->map(function ($r) {
            return [
                'id'             => $r->id,
                'type'           => 'return',
                'amount'         => (float) $r->total_amount,
                'description'    => $r->reason ?? ('مرتجع فاتورة #' . $r->invoice_number),
                'reference_type' => 'sales_returns',
                'reference_id'   => $r->id,
                'invoice_number' => $r->return_number ?? ('RTN-' . $r->id),
                'transaction_date' => $r->created_at?->toDateTimeString(),
                'created_at'     => $r->created_at?->toDateTimeString(),
                'created_by'     => $r->user?->username ?? null,
                'is_deleted'     => false,
                // Extra context
                'payment_type'   => $r->payment_type,
                'customer_id'    => $r->customer_id,
                'customer_name'  => $r->customer_name,
                'related_invoice_number' => $r->invoice_number,
                'total_amount'   => (float) $r->total_amount,
                'subtotal'       => (float) $r->subtotal,
                'vat_amount'     => (float) $r->vat_amount,
                'discount_amount' => 0,
            ];
        });

        return $this->successResponse([
            'data' => $data,
            'stats' => [
                'total_debit'          => 0,
                'total_credit'         => (float) ($statsData->total_returns ?? 0),
                'total_returns'        => (float) ($statsData->total_returns ?? 0),
                'total_cash_returns'   => (float) ($statsData->total_cash_returns ?? 0),
                'total_credit_returns' => (float) ($statsData->total_credit_returns ?? 0),
                'total_receipts'       => 0,
                'balance'              => 0,
                'transaction_count'    => (int) ($statsData->transaction_count ?? 0),
            ],
            'pagination' => [
                'current_page'  => $page,
                'per_page'      => $perPage,
                'total_records' => $total,
                'total_pages'   => $total > 0 ? ceil($total / $perPage) : 1,
            ],
        ]);
    }
}
