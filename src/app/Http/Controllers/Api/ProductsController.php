<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class ProductsController extends Controller
{
    use BaseApiController;
    public function index(Request $request): JsonResponse
    {
        PermissionService::requirePermission('products', 'view');

        $search = $request->input('search', '');
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = Product::with(['createdBy', 'category']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhereHas('category', function ($mq) use ($search) {
                       $mq->where('name', 'like', "%$search%");
                  })
                  ->orWhere('description', 'like', "%$search%")
                  ->orWhere('id', 'like', "%$search%");
            });
        }

        $total = $query->count();
        $products = $query->orderBy('id', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse(
            \App\Http\Resources\ProductResource::collection($products),
            $total,
            $page,
            $perPage
        );
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        PermissionService::requirePermission('products', 'create');

        $validated = $request->validated();

        $validated['created_by'] = auth()->id() ?? session('user_id');

        $product = Product::create($validated);

        TelescopeService::logOperation('CREATE', 'products', $product->id, null, $validated);

        return response()->json([
            'success' => true,
            'id' => $product->id,
        ]);
    }

    public function update(UpdateProductRequest $request): JsonResponse
    {
        PermissionService::requirePermission('products', 'edit');

        $validated = $request->validated();

        $product = Product::findOrFail($validated['id']);
        $oldValues = $product->toArray();
        $product->update($validated);

        TelescopeService::logOperation('UPDATE', 'products', $product->id, $oldValues, $validated);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        PermissionService::requirePermission('products', 'delete');

        $id = $request->input('id');
        $product = Product::findOrFail($id);
        $oldValues = $product->toArray();
        $product->delete();

        TelescopeService::logOperation('DELETE', 'products', $id, $oldValues, null);

        return response()->json(['success' => true]);
    }
}
