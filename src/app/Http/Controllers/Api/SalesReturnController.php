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
}
