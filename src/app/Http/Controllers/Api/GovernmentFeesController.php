<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GovernmentFee;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\PermissionService;

class GovernmentFeesController extends Controller
{
    use BaseApiController;

    public function index(): JsonResponse
    {
        PermissionService::requirePermission('settings', 'view'); // Assuming this falls under settings permission

        $fees = GovernmentFee::with('account')
            ->orderBy('id', 'desc')
            ->get();

        return $this->successResponse(['fees' => $fees]);
    }

    public function store(Request $request): JsonResponse
    {
        PermissionService::requirePermission('settings', 'edit');

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50',
            'percentage' => 'required|numeric|min:0|max:100',
            'fixed_amount' => 'nullable|numeric|min:0',
            'account_id' => 'required|exists:chart_of_accounts,id',
            'is_active' => 'boolean'
        ]);

        $fee = GovernmentFee::create($validated);

        return $this->successResponse(['fee' => $fee], 'Government Fee created successfully');
    }

    public function show($id): JsonResponse
    {
        PermissionService::requirePermission('settings', 'view');
        
        $fee = GovernmentFee::with('account')->findOrFail($id);
        
        return $this->successResponse(['fee' => $fee]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        PermissionService::requirePermission('settings', 'edit');

        $fee = GovernmentFee::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'code' => 'sometimes|nullable|string|max:50',
            'percentage' => 'sometimes|numeric|min:0|max:100',
            'fixed_amount' => 'nullable|numeric|min:0',
            'account_id' => 'sometimes|exists:chart_of_accounts,id',
            'is_active' => 'boolean'
        ]);

        $fee->update($validated);

        return $this->successResponse(['fee' => $fee], 'Government Fee updated successfully');
    }

    public function destroy($id): JsonResponse
    {
        PermissionService::requirePermission('settings', 'edit');

        $fee = GovernmentFee::findOrFail($id);
        
        // Optional: Check if used in InvoiceFees before deleting, or just prevent delete
        // For now, allow delete. InvoiceFees has nullOnDelete for fee_id, but the record remains.

        $fee->delete();

        return $this->successResponse([], 'Government Fee deleted successfully');
    }
}
