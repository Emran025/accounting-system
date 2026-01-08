<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseRequest;
use App\Models\Product;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use App\Http\Requests\StorePurchaseRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;

class PurchasesController extends Controller
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

    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'view');

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
            ->get()
            ->map(function ($purchase) {
                return [
                    'id' => $purchase->id,
                    'product_id' => $purchase->product_id,
                    'product_name' => $purchase->product->name,
                    'quantity' => $purchase->quantity,
                    'invoice_price' => $purchase->invoice_price,
                    'unit_type' => $purchase->unit_type,
                    'production_date' => $purchase->production_date,
                    'expiry_date' => $purchase->expiry_date,
                    'purchase_date' => $purchase->purchase_date,
                    'voucher_number' => $purchase->voucher_number,
                    'approval_status' => $purchase->approval_status,
                ];
            });

        return $this->paginatedResponse($purchases, $total, $page, $perPage);
    }

    public function store(StorePurchaseRequest $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'create');

        $validated = $request->validated();

        try {
            $product = Product::findOrFail($validated['product_id']);
            $itemsPerUnit = $product->items_per_unit ?? 1;
            $actualQuantity = ($validated['unit_type'] === 'main') 
                ? ($validated['quantity'] * $itemsPerUnit) 
                : $validated['quantity'];

            $unitCost = $validated['invoice_price'] / $actualQuantity;
            $vatRate = $validated['vat_rate'] ?? 0;
            $vatAmount = $validated['vat_amount'] ?? ($validated['invoice_price'] * $vatRate / 100);
            $subtotal = $validated['invoice_price'] - $vatAmount;

            // Determine approval status
            $approvalThreshold = (float) \App\Models\Setting::where('setting_key', 'purchase_approval_threshold')
                ->value('setting_value') ?? 10000;
            $approvalStatus = $validated['invoice_price'] >= $approvalThreshold ? 'pending' : 'approved';

            $purchase = Purchase::create([
                'product_id' => $validated['product_id'],
                'quantity' => $validated['quantity'],
                'invoice_price' => $validated['invoice_price'],
                'unit_type' => $validated['unit_type'],
                'production_date' => $validated['production_date'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'vat_rate' => $vatRate,
                'vat_amount' => $vatAmount,
                'user_id' => auth()->id() ?? session('user_id'),
                'approval_status' => $approvalStatus,
                'voucher_number' => $this->ledgerService->getNextVoucherNumber('PUR'),
            ]);

            // If approved, process immediately
            if ($approvalStatus === 'approved') {
                $this->processPurchase($purchase, $actualQuantity, $unitCost, $subtotal);
            }

            TelescopeService::logOperation('CREATE', 'purchases', $purchase->id, null, $validated);

            return response()->json([
                'success' => true,
                'id' => $purchase->id,
                'voucher_number' => $purchase->voucher_number,
                'approval_status' => $approvalStatus,
                'message' => $approvalStatus === 'pending' ? 'Purchase created and pending approval' : 'Purchase created successfully',
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    private function processPurchase(Purchase $purchase, int $actualQuantity, float $unitCost, float $subtotal): void
    {
        DB::transaction(function () use ($purchase, $actualQuantity, $unitCost, $subtotal) {
            // Update stock
            $purchase->product->increment('stock_quantity', $actualQuantity);

            // Update weighted average cost
            $currentStock = $purchase->product->stock_quantity;
            $currentCost = $purchase->product->weighted_average_cost ?? 0;
            $newCost = (($currentStock - $actualQuantity) * $currentCost + $purchase->invoice_price) / $currentStock;
            $purchase->product->update(['weighted_average_cost' => $newCost]);

            // Post to GL
            $accounts = $this->coaService->getStandardAccounts();
            $glEntries = [
                [
                    'account_code' => $accounts['inventory'],
                    'entry_type' => 'DEBIT',
                    'amount' => $subtotal,
                    'description' => "Purchase - Voucher #{$purchase->voucher_number}"
                ],
            ];

            if ($purchase->vat_amount > 0) {
                $glEntries[] = [
                    'account_code' => $accounts['input_vat'],
                    'entry_type' => 'DEBIT',
                    'amount' => $purchase->vat_amount,
                    'description' => "VAT Input - Voucher #{$purchase->voucher_number}"
                ];
            }

            // Credit side (Cash or AP)
            $paymentType = 'cash'; // Default, can be extended
            $glEntries[] = [
                'account_code' => $paymentType === 'cash' ? $accounts['cash'] : $accounts['accounts_payable'],
                'entry_type' => 'CREDIT',
                'amount' => $purchase->invoice_price,
                'description' => "Purchase Payment - Voucher #{$purchase->voucher_number}"
            ];

            $this->ledgerService->postTransaction(
                $glEntries,
                'purchases',
                $purchase->id,
                $purchase->voucher_number,
                now()->format('Y-m-d')
            );
        });
    }

    public function requests(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'view');

        $requests = PurchaseRequest::with(['product', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->successResponse($requests);
    }

    public function storeRequest(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'create');

        $validated = $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'product_name' => 'nullable|string|max:255',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        if (!$validated['product_id'] && !$validated['product_name']) {
            return $this->errorResponse('Either product_id or product_name is required', 400);
        }

        $request = PurchaseRequest::create([
            'product_id' => $validated['product_id'] ?? null,
            'product_name' => $validated['product_name'] ?? null,
            'quantity' => $validated['quantity'],
            'notes' => $validated['notes'] ?? null,
            'user_id' => auth()->id() ?? session('user_id'),
            'status' => 'pending',
        ]);

        return $this->successResponse(['id' => $request->id]);
    }

    public function updateRequest(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'edit');

        $validated = $request->validate([
            'id' => 'required|exists:purchase_requests,id',
            'status' => 'required|in:approved,rejected',
        ]);

        $purchaseRequest = PurchaseRequest::findOrFail($validated['id']);
        $purchaseRequest->update(['status' => $validated['status']]);

        return $this->successResponse();
    }
}
