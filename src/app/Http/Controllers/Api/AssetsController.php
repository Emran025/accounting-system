<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class AssetsController extends Controller
{
    use BaseApiController;

    public function index(Request $request): JsonResponse
    {


        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = Asset::with('createdBy');

        $total = $query->count();
        $assets = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse($assets, $total, $page, $perPage);
    }

    public function store(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'purchase_value' => 'required|numeric|min:0.01',

            'purchase_date' => 'required|date',
            'depreciation_rate' => 'nullable|numeric|min:0|max:100',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,disposed',
        ]);

        $asset = Asset::create([
            ...$validated,
            'status' => $validated['status'] ?? 'active',
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'assets', $asset->id, null, $validated);

        return $this->successResponse(['id' => $asset->id]);
    }

    public function update(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:assets,id',
            'name' => 'required|string|max:255',
            'purchase_value' => 'required|numeric|min:0.01',
            'purchase_date' => 'required|date',
            'depreciation_rate' => 'nullable|numeric|min:0|max:100',
            'description' => 'nullable|string',
            'status' => 'nullable|in:active,disposed',
        ]);

        $asset = Asset::findOrFail($validated['id']);
        $oldValues = $asset->toArray();
        $asset->update($validated);

        TelescopeService::logOperation('UPDATE', 'assets', $asset->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroy(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $asset = Asset::findOrFail($id);
        $oldValues = $asset->toArray();
        $asset->delete();

        TelescopeService::logOperation('DELETE', 'assets', $id, $oldValues, null);

        return $this->successResponse();
    }
}
