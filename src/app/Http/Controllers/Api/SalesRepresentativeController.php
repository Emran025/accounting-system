<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalesRepresentative;
use App\Models\SalesRepresentativeTransaction;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Resources\SalesRepresentativeResource;
use App\Http\Resources\SalesRepresentativeTransactionResource;

class SalesRepresentativeController extends Controller
{
    use BaseApiController;

    public function representatives(Request $request): JsonResponse
    {
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));
        $search = $request->input('search', '');

        $query = SalesRepresentative::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('phone', 'like', "%$search%");
            });
        }

        $total = $query->count();
        $representatives = $query->orderBy('name')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->withSum(['transactions as total_sales' => function ($query) {
                $query->where('type', 'commission')->where('is_deleted', false);
            }], 'amount')
            ->get()
            ->map(function ($rep) {
                $rep->total_sales = $rep->total_sales ?? 0;
                $rep->total_paid = max(0, $rep->total_sales - $rep->current_balance);
                return $rep;
            });

        return $this->paginatedResponse(
            SalesRepresentativeResource::collection($representatives),
            $total,
            $page,
            $perPage
        );
    }

    public function storeRepresentative(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $exists = SalesRepresentative::where('name', $validated['name'])->exists();
        if ($exists) {
            return $this->errorResponse('Sales Representative with this name already exists', 409);
        }

        $representative = SalesRepresentative::create([
            ...$validated,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'sales_representatives', $representative->id, null, $validated);

        return $this->successResponse(['id' => $representative->id]);
    }

    public function updateRepresentative(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'required|exists:sales_representatives,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $representative = SalesRepresentative::findOrFail($validated['id']);
    
        $exists = SalesRepresentative::where('id', '!=', $representative->id)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return $this->errorResponse('Another representative with this name already exists', 409);
        }

        $oldValues = $representative->toArray();
        $representative->update($validated);

        TelescopeService::logOperation('UPDATE', 'sales_representatives', $representative->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroyRepresentative(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $representative = SalesRepresentative::findOrFail($id);
        $oldValues = $representative->toArray();
        $representative->delete();

        TelescopeService::logOperation('DELETE', 'sales_representatives', $id, $oldValues, null);

        return $this->successResponse();
    }

    public function ledger(Request $request): JsonResponse
    {
        $representativeId = $request->input('sales_representative_id');
        if (!$representativeId) {
            return $this->errorResponse('sales_representative_id is required', 400);
        }

        $representative = SalesRepresentative::findOrFail($representativeId);
        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = SalesRepresentativeTransaction::where('sales_representative_id', $representativeId);

        if ($request->boolean('show_deleted')) {
             $query->where('is_deleted', true);
        } else {
             $query->where('is_deleted', false);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%$search%")
                  ->orWhere('reference_id', 'like', "%$search%")
                  ->orWhere('amount', 'like', "%$search%");
            });
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('transaction_date', '>=', $dateFrom);
        }

        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('transaction_date', '<=', $dateTo);
        }

        $statsData = (clone $query)->selectRaw('
            SUM(CASE WHEN type = "commission" THEN amount ELSE 0 END) as total_commissions,
            SUM(CASE WHEN type IN ("payment", "return") THEN amount ELSE 0 END) as total_payments,
            SUM(CASE WHEN type = "return" THEN amount ELSE 0 END) as total_returns,
            COUNT(*) as transaction_count
        ')->first();

        $total = $query->count();
        $transactions = $query->with('createdBy')
            ->orderBy('transaction_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->successResponse([
            'representative' => [
                'id' => $representative->id,
                'name' => $representative->name,
                'current_balance' => (float)$representative->current_balance,
            ],
            'data' => SalesRepresentativeTransactionResource::collection($transactions),
            'stats' => [
                'total_commissions' => (float)($statsData->total_commissions ?? 0),
                'total_payments' => (float)($statsData->total_payments ?? 0),
                'total_returns' => (float)($statsData->total_returns ?? 0),
                'balance' => (float)$representative->current_balance,
                'transaction_count' => (int)($statsData->transaction_count ?? 0),
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_records' => $total,
                'total_pages' => ceil($total / $perPage),
            ],
        ]);
    }

    public function storeTransaction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sales_representative_id' => 'required|exists:sales_representatives,id',
            'type' => 'required|in:payment,adjustment',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated) {
            $transaction = SalesRepresentativeTransaction::create([
                'sales_representative_id' => $validated['sales_representative_id'],
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'description' => $validated['description'] ?? '',
                'transaction_date' => $validated['date'] ?? now(),
                'created_by' => auth()->id() ?? session('user_id'),
            ]);

            $balanceChange = -$validated['amount'];
            
            SalesRepresentative::where('id', $validated['sales_representative_id'])
                ->increment('current_balance', $balanceChange);

            TelescopeService::logOperation('CREATE', 'sales_representative_transactions', $transaction->id, null, $validated);

            return $this->successResponse(['id' => $transaction->id]);
        });
    }

    public function destroyTransaction(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $transaction = SalesRepresentativeTransaction::findOrFail($id);

        if ($transaction->type === 'commission' || $transaction->type === 'return') {
            return $this->errorResponse('Cannot delete commission or return transactions from here. Please use the Invoices module.', 400);
        }

        return DB::transaction(function () use ($transaction) {
            $balanceChange = $transaction->amount;
            
            SalesRepresentative::where('id', $transaction->sales_representative_id)
                ->increment('current_balance', $balanceChange);

            $transaction->update([
                'is_deleted' => true,
                'deleted_at' => now(),
            ]);

            TelescopeService::logOperation('DELETE', 'sales_representative_transactions', $transaction->id, $transaction->toArray(), null);

            return $this->successResponse();
        });
    }
}
