<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class CategoriesController extends Controller
{
    use BaseApiController;

    public function index(): JsonResponse
    {


        $categories = Category::orderBy('name')->get();

        return $this->successResponse($categories);
    }

    public function store(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:categories',
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'categories', $category->id, null, $validated);

        return $this->successResponse(['id' => $category->id]);
    }

    public function update(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:categories,id',
            'name' => 'required|string|max:100',
        ]);

        $category = Category::findOrFail($validated['id']);
        $oldValues = $category->toArray();
        $category->update($validated);

        TelescopeService::logOperation('UPDATE', 'categories', $category->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $category = Category::findOrFail($id);
        $oldValues = $category->toArray();
        $category->delete();

        TelescopeService::logOperation('DELETE', 'categories', $id, $oldValues, null);

        return $this->successResponse();
    }
}
