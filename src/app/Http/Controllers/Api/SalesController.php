<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SalesService;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Models\Invoice;
use App\Http\Requests\StoreInvoiceRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class SalesController extends Controller
{
    use BaseApiController;
    private SalesService $salesService;

    public function __construct(SalesService $salesService)
    {
        $this->salesService = $salesService;
    }

    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('sales', 'view');

        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $paymentType = $request->input('payment_type');
        $customerId = $request->input('customer_id');

        $query = Invoice::with(['user', 'customer'])->withCount('items');

        if ($paymentType) {
            $query->where('payment_type', $paymentType);
        }

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        $total = $query->count();
        $invoices = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse(
            \App\Http\Resources\InvoiceResource::collection($invoices), 
            $total, 
            $page, 
            $perPage
        );
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        PermissionService::requirePermission('sales', 'create');

        $validated = $request->validated();
        $validated['user_id'] = auth()->id() ?? session('user_id');

        try {
            $invoiceId = $this->salesService->createInvoice($validated);
            TelescopeService::logOperation('CREATE', 'invoices', $invoiceId, null, $validated);

            return $this->successResponse(['id' => $invoiceId], 'Invoice created successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Let Laravel handle validation exceptions (422)
            throw $e;
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            // Product not found or similar - return 404
            return $this->errorResponse('Resource not found: ' . $e->getMessage(), 404);
        } catch (\Exception $e) {
            // Fix BUG-006: Differentiate between business logic errors and system failures
            \Illuminate\Support\Facades\Log::error('Invoice Creation Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            // If it's a known business rule violation (contains specific keywords), return 400
            $businessRuleKeywords = ['price violation', 'insufficient stock', 'required', 'mismatch'];
            $isBusinessRule = false;
            foreach ($businessRuleKeywords as $keyword) {
                if (stripos($e->getMessage(), $keyword) !== false) {
                    $isBusinessRule = true;
                    break;
                }
            }
            
            if ($isBusinessRule) {
                return $this->errorResponse($e->getMessage(), 400);
            }
            
            // Otherwise it's a system error
            return $this->errorResponse('System error: ' . $e->getMessage(), 500);
        }
    }

    public function show(Request $request): JsonResponse
    {
        $id = $request->input('id');
        if (!$id) {
            return $this->errorResponse('Invoice ID is required', 400);
        }
        PermissionService::requirePermission('sales', 'view');

        $invoice = Invoice::with(['items.product', 'user', 'customer', 'zatcaEinvoice'])
            ->withCount('items')
            ->findOrFail($id);

        return $this->successResponse(new \App\Http\Resources\InvoiceResource($invoice));
    }

    public function destroy(Request $request): JsonResponse
    {
        PermissionService::requirePermission('sales', 'delete');

        $id = $request->input('id');
        $invoice = Invoice::findOrFail($id);
        $oldValues = $invoice->toArray();

        try {
            $this->salesService->deleteInvoice($id);
            TelescopeService::logOperation('DELETE', 'invoices', $id, $oldValues, null);

            return response()->json([
                'success' => true,
                'message' => 'Invoice deleted successfully'
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
