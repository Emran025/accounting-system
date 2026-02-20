<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseRequest;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\PurchaseService;
use App\Http\Requests\StorePurchaseRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

/**
 * Controller for managing Purchase operations via API.
 * Handles creation, approval, reversal, and purchase requests.
 */
class PurchasesController extends Controller
{
    use BaseApiController;

    private PurchaseService $purchaseService;

    /**
     * PurchasesController constructor.
     * 
     * @param PurchaseService $purchaseService
     */
    public function __construct(PurchaseService $purchaseService) {
        $this->purchaseService = $purchaseService;
    }

    /**
     * List all purchases with pagination and search.
     * 
     * @param Request $request
     * @return JsonResponse Paginated list of purchases
     */
    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $search = $request->input('search', '');

        $query = Purchase::with(['product', 'user', 'supplier']);

        if ($search) {
            $query->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%$search%");
            });
        }

        $total = $query->count();
        $purchases = $query->orderBy('purchase_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse(
            \App\Http\Resources\PurchaseResource::collection($purchases),
            $total,
            $page,
            $perPage
        );
    }

    /**
     * Store a new purchase or create a purchase return.
     * Delegates to PurchaseService for VAT validation and approval workflow.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $type = $request->input('type', 'purchase');
        $userId = auth()->id() ?? session('user_id');

        try {
            if ($type === 'return') {
                $validated = $request->validate([
                    'invoice_id' => 'required|exists:purchases,id',
                    'items' => 'required|array|min:1',
                    'items.*.invoice_item_id' => 'required', // For purchases, this is the purchase ID itself
                    'items.*.return_quantity' => 'required|integer|min:1',
                    'reason' => 'nullable|string|max:500',
                ]);

                $returnId = $this->purchaseService->createReturn(
                    $validated['invoice_id'],
                    $validated['items'],
                    $validated['reason'] ?? null,
                    $userId
                );

                TelescopeService::logOperation('CREATE', 'purchase_returns', $returnId, null, $validated);

                return $this->successResponse(['id' => $returnId], 'تم تسجيل المرتجع بنجاح');
            }

            // Standard Purchase
            $storeRequest = app(StorePurchaseRequest::class);
            $validated = $storeRequest->validated();
            
            $purchase = $this->purchaseService->createPurchase($validated, $userId);

            TelescopeService::logOperation('CREATE', 'purchases', $purchase->id, null, $validated);

            return response()->json([
                'success' => true,
                'id' => $purchase->id,
                'voucher_number' => $purchase->voucher_number,
                'approval_status' => $purchase->approval_status,
                'message' => $purchase->approval_status === 'pending' ? 'Purchase created and pending approval' : 'Purchase created successfully',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage(), 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
             \Illuminate\Support\Facades\Log::error('Purchase Operation Error: ' . $e->getMessage());
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Get a single purchase or return details.
     * Supports fetching via ?id=...
     */
    public function show(Request $request): JsonResponse
    {
        $id = $request->input('id');
        if (!$id) {
            return $this->errorResponse('ID is required', 400);
        }

        $purchase = Purchase::with(['product', 'user', 'supplier'])->findOrFail($id);
        
        // CRITICAL FIX: Resource-level authorization
        $this->authorize('view', $purchase);

        // Map to a format compatible with SalesReturnDialog (DetailedInvoice)
        $data = [
            'id' => $purchase->id,
            'invoice_number' => $purchase->voucher_number,
            'total_amount' => (float)$purchase->invoice_price,
            'subtotal' => (float)($purchase->invoice_price - $purchase->vat_amount),
            'vat_amount' => (float)$purchase->vat_amount,
            'items' => [
                [
                    'id' => $purchase->id, // Use purchase ID as item ID
                    'invoice_id' => $purchase->id,
                    'product_id' => $purchase->product_id,
                    'product_name' => $purchase->product?->name,
                    'quantity' => (float)$purchase->quantity,
                    'unit_price' => $purchase->quantity > 0 ? (float)($purchase->invoice_price / $purchase->quantity) : 0,
                    'subtotal' => (float)($purchase->invoice_price - $purchase->vat_amount),
                    'maxQuantity' => (float)$purchase->quantity, // For return dialog validation
                ]
            ]
        ];

        return $this->successResponse($data);
    }

    public function requests(Request $request): JsonResponse
    {


        $requests = PurchaseRequest::with(['product', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse($requests);
    }

    public function storeRequest(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'product_name' => 'nullable|string|max:255',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
            'supplier_name' => 'nullable|string|max:255',
        ]);

        if (!$validated['product_id'] && !$validated['product_name']) {
            return $this->errorResponse('Either product_id or product_name is required', 400);
        }

        $purchaseRequest = PurchaseRequest::create([
            'product_id' => $validated['product_id'] ?? null,
            'product_name' => $validated['product_name'] ?? null,
            'quantity' => $validated['quantity'],
            'notes' => $validated['notes'] ?? null,
            'user_id' => auth()->id() ?? session('user_id'),
            'status' => 'pending',
        ]);

        return $this->successResponse(['id' => $purchaseRequest->id]);
    }

    public function updateRequest(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:purchase_requests,id',
            'status' => 'required|in:approved,rejected,done',
        ]);

        $purchaseRequest = PurchaseRequest::findOrFail($validated['id']);
        $purchaseRequest->update(['status' => $validated['status']]);

        return $this->successResponse();
    }

    /**
     * Auto-generates purchase requests for products that are below their low stock threshold.
     * 
     * @return JsonResponse
     */
    public function autoGenerateRequests(): JsonResponse
    {
        $products = \App\Models\Product::whereRaw('stock_quantity <= low_stock_threshold')->get();
        $generatedCount = 0;
        $userId = auth()->id() ?? session('user_id');

        foreach ($products as $product) {
            // Check if there is already a pending request for this product
            $existingRequest = PurchaseRequest::where('product_id', $product->id)
                ->where('status', 'pending')
                ->first();

            if (!$existingRequest) {
                // Calculate suggested quantity (e.g., minimum of 10 or twice the low stock threshold)
                $suggestedQuantity = max(10, $product->low_stock_threshold * 2);

                PurchaseRequest::create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $suggestedQuantity,
                    'user_id' => $userId,
                    'status' => 'pending',
                    'notes' => 'Auto-generated due to low stock (' . $product->stock_quantity . ' left)',
                ]);
                $generatedCount++;
            }
        }

        return $this->successResponse([
            'message' => "Successfully generated {$generatedCount} purchase requests for low stock items.",
            'generated_count' => $generatedCount
        ]);
    }

    /**
     * Approve a pending purchase.
     * Enforces resource-level authorization before approval.
     * 
     * @param Request $request
     * @return JsonResponse Success or error message
     */
    public function approve(Request $request): JsonResponse
    {


        $purchaseId = $request->input('id');
        $purchase = Purchase::findOrFail($purchaseId);
        
        // CRITICAL FIX: Resource-level authorization
        $this->authorize('approve', $purchase);
        
        $userId = auth()->id() ?? session('user_id');

        try {
            $success = $this->purchaseService->approvePurchase((int)$purchaseId, (int)$userId);
            
            if (!$success) {
                return $this->errorResponse('Purchase already approved or not found', 400);
            }

            TelescopeService::logOperation('UPDATE', 'purchases', $purchaseId, null, ['action' => 'approve']);

            return $this->successResponse(['message' => 'Purchase approved and processed successfully']);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Reverse (soft-delete) a purchase.
     * Enforces resource-level authorization and delegates to service for
     * stock restoration and GL reversal.
     * 
     * @param Request $request
     * @return JsonResponse Success or error message
     */
    public function destroy(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $purchase = Purchase::findOrFail($id);
        
        // CRITICAL FIX: Resource-level authorization
        $this->authorize('delete', $purchase);
        
        $userId = auth()->id() ?? session('user_id');

        try {
            $this->purchaseService->reversePurchase((int)$id, (int)$userId);
            
            TelescopeService::logOperation('REVERSE', 'purchases', $id, null, ['action' => 'reverse']);

            return $this->successResponse(['message' => 'Purchase reversed successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Unified purchase returns ledger (fetches ApTransactions where type='return' and reference='purchases')
     */
    public function returnsLedger(\Illuminate\Http\Request $request): JsonResponse
    {
        $page    = max(1, (int) $request->input('page', 1));
        $perPage = min(100, max(1, (int) $request->input('per_page', 20)));
        $offset  = ($page - 1) * $perPage;

        // Base query on ap_transactions
        $query = \App\Models\ApTransaction::with(['supplier', 'createdBy'])
            ->leftJoin('purchases', function($join) {
                // Since ap_transactions reference_id represents the purchase.id
                $join->on('ap_transactions.reference_id', '=', 'purchases.id')
                     ->where('ap_transactions.reference_type', '=', 'purchases');
            })
            ->leftJoin('ap_suppliers', 'ap_transactions.supplier_id', '=', 'ap_suppliers.id')
            ->where('ap_transactions.type', 'return')
            ->where('ap_transactions.is_deleted', false)
            ->select(
                'ap_transactions.*',
                'purchases.payment_type',
                'purchases.invoice_price',
                'purchases.voucher_number',
                'ap_suppliers.name as supplier_name'
            );

        // Search:
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('ap_transactions.description', 'like', "%{$search}%")
                  ->orWhere('ap_suppliers.name', 'like', "%{$search}%")
                  ->orWhere('purchases.voucher_number', 'like', "%{$search}%")
                  ->orWhere('ap_transactions.amount', 'like', "%{$search}%");
            });
        }

        if ($type = $request->input('type')) {
            $query->where('purchases.payment_type', $type);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('ap_transactions.transaction_date', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('ap_transactions.transaction_date', '<=', $dateTo);
        }

        // Stats
        $statsData = (clone $query)->selectRaw('
            COUNT(*) as transaction_count,
            SUM(ap_transactions.amount) as total_returns,
            SUM(CASE WHEN purchases.payment_type = "cash" THEN ap_transactions.amount ELSE 0 END) as total_cash_returns,
            SUM(CASE WHEN purchases.payment_type = "credit" THEN ap_transactions.amount ELSE 0 END) as total_credit_returns
        ')->first();

        $total   = $query->count();
        $returns = $query
            ->orderBy('ap_transactions.transaction_date', 'desc')
            ->skip($offset)
            ->take($perPage)
            ->get();

        // format to mirror ledger/sales returns shape
        $data = $returns->map(function ($r) {
            return [
                'id'             => $r->id,
                'type'           => 'return',
                'amount'         => (float) $r->amount,
                'description'    => $r->description,
                'reference_type' => $r->reference_type,
                'reference_id'   => $r->reference_id, // This is the purchase ID!
                'transaction_date' => $r->transaction_date,
                'created_at'     => $r->created_at?->toDateTimeString(),
                'created_by'     => $r->createdBy?->name ?? null,
                'is_deleted'     => false,
                'payment_type'   => $r->payment_type,
                'supplier_id'    => $r->supplier_id,
                'supplier_name'  => $r->supplier_name,
                'related_invoice_number' => $r->voucher_number,
                // Add alias for frontend component compatibility
                'invoice_number' => $r->voucher_number ?? ('PR-' . $r->reference_id), 
            ];
        });

        return $this->successResponse([
            'data' => $data,
            'stats' => [
                'total_returns'        => (float) ($statsData->total_returns ?? 0),
                'total_cash_returns'   => (float) ($statsData->total_cash_returns ?? 0),
                'total_credit_returns' => (float) ($statsData->total_credit_returns ?? 0),
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
