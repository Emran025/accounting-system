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

class PurchasesController extends Controller
{
    use BaseApiController;

    private PurchaseService $purchaseService;

    public function __construct(PurchaseService $purchaseService) {
        $this->purchaseService = $purchaseService;
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
            ->get();

        return $this->paginatedResponse(
            \App\Http\Resources\PurchaseResource::collection($purchases),
            $total,
            $page,
            $perPage
        );
    }

    public function store(StorePurchaseRequest $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'create');

        try {
            $userId = auth()->id() ?? session('user_id');
            $purchase = $this->purchaseService->createPurchase($request->validated(), $userId);

            TelescopeService::logOperation('CREATE', 'purchases', $purchase->id, null, $request->validated());

            return response()->json([
                'success' => true,
                'id' => $purchase->id,
                'voucher_number' => $purchase->voucher_number,
                'approval_status' => $purchase->approval_status,
                'message' => $purchase->approval_status === 'pending' ? 'Purchase created and pending approval' : 'Purchase created successfully',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
             \Illuminate\Support\Facades\Log::error('Purchase Creation Error: ' . $e->getMessage());
            return $this->errorResponse($e->getMessage(), 500);
        }
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
        PermissionService::requirePermission('purchases', 'edit');

        $validated = $request->validate([
            'id' => 'required|exists:purchase_requests,id',
            'status' => 'required|in:approved,rejected',
        ]);

        $purchaseRequest = PurchaseRequest::findOrFail($validated['id']);
        $purchaseRequest->update(['status' => $validated['status']]);

        return $this->successResponse();
    }

    public function approve(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'edit');

        $purchaseId = $request->input('id');
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

    public function destroy(Request $request): JsonResponse
    {
        PermissionService::requirePermission('purchases', 'delete');

        $id = $request->input('id');
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
}
