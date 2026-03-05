<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostCenter;
use App\Models\ProfitCenter;
use App\Models\GeneralLedger;
use App\Services\TelescopeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CostProfitCenterController extends Controller
{
    use BaseApiController;

    // ═══════════════════════════════════════════════════════════════════
    // COST CENTERS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * List all cost centres (paginated, searchable, with hierarchy info).
     */
    public function costCentersIndex(Request $request): JsonResponse
    {
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', $request->input('limit', 20))));

        $query = CostCenter::with(['parent', 'account', 'manager', 'createdBy', 'children']);

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by type
        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by parent (for tree drill-down)
        if ($request->has('parent_id')) {
            $parentId = $request->input('parent_id');
            $query->where('parent_id', $parentId === 'null' ? null : $parentId);
        }

        $total = $query->count();
        $items = $query->orderBy('code', 'asc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        // Enrich with actual costs from GL
        $items->each(function ($center) {
            $center->recorder_name = $center->createdBy->name ?? null;
            $center->parent_name   = $center->parent->name ?? null;
            $center->account_name  = $center->account->account_name ?? null;
            $center->manager_name  = $center->manager->name ?? null;
            $center->children_count = $center->children->count();

            // Sum actual costs from GL
            $center->actual_cost = GeneralLedger::where('cost_center_id', $center->id)
                ->where('entry_type', 'DEBIT')
                ->sum('amount');
            $center->budget_utilization = $center->budget > 0
                ? round(($center->actual_cost / $center->budget) * 100, 2)
                : 0;
        });

        return $this->paginatedResponse($items, $total, $page, $perPage);
    }

    /**
     * Get full hierarchy tree for cost centres.
     */
    public function costCentersTree(): JsonResponse
    {
        $centers = CostCenter::with(['children', 'account'])
                    ->where('is_active', true)
                    ->whereNull('parent_id')
                    ->get();

        $tree = $this->buildTree($centers, 'cost');

        return $this->successResponse(['tree' => $tree]);
    }

    /**
     * Store a new cost centre.
     */
    public function costCentersStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'        => 'required|string|max:20|unique:cost_centers,code',
            'name'        => 'required|string|max:255',
            'name_en'     => 'nullable|string|max:255',
            'parent_id'   => 'nullable|exists:cost_centers,id',
            'account_id'  => 'nullable|exists:chart_of_accounts,id',
            'manager_id'  => 'nullable|exists:employees,id',
            'budget'      => 'nullable|numeric|min:0',
            'type'        => 'nullable|in:operational,administrative,production,support',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        $center = CostCenter::create([
            ...$validated,
            'type'       => $validated['type'] ?? 'operational',
            'is_active'  => $validated['is_active'] ?? true,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'cost_centers', $center->id, null, $validated);

        return $this->successResponse(['id' => $center->id], 'تم إنشاء مركز التكلفة بنجاح');
    }

    /**
     * Show a single cost centre.
     */
    public function costCentersShow(int $id): JsonResponse
    {
        $center = CostCenter::with(['parent', 'account', 'manager', 'createdBy', 'children'])
            ->findOrFail($id);

        $center->recorder_name = $center->createdBy->name ?? null;
        $center->parent_name   = $center->parent->name ?? null;
        $center->account_name  = $center->account->account_name ?? null;
        $center->manager_name  = $center->manager->name ?? null;

        // GL summaries
        $center->actual_cost = GeneralLedger::where('cost_center_id', $center->id)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
        $center->budget_utilization = $center->budget > 0
            ? round(($center->actual_cost / $center->budget) * 100, 2)
            : 0;

        return $this->successResponse(['cost_center' => $center]);
    }

    /**
     * Update cost centre.
     */
    public function costCentersUpdate(Request $request, int $id): JsonResponse
    {
        $center = CostCenter::findOrFail($id);

        $validated = $request->validate([
            'code'        => "required|string|max:20|unique:cost_centers,code,{$id}",
            'name'        => 'required|string|max:255',
            'name_en'     => 'nullable|string|max:255',
            'parent_id'   => 'nullable|exists:cost_centers,id',
            'account_id'  => 'nullable|exists:chart_of_accounts,id',
            'manager_id'  => 'nullable|exists:employees,id',
            'budget'      => 'nullable|numeric|min:0',
            'type'        => 'nullable|in:operational,administrative,production,support',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        // Prevent circular parent references
        if (isset($validated['parent_id']) && $validated['parent_id'] == $id) {
            return $this->errorResponse('لا يمكن تعيين المركز كأب لنفسه', 422);
        }

        $oldValues = $center->toArray();
        $center->update($validated);

        TelescopeService::logOperation('UPDATE', 'cost_centers', $center->id, $oldValues, $validated);

        return $this->successResponse([], 'تم تحديث مركز التكلفة بنجاح');
    }

    /**
     * Delete cost centre (only if no GL entries reference it).
     */
    public function costCentersDestroy(int $id): JsonResponse
    {
        $center = CostCenter::findOrFail($id);

        // Guard: prevent deletion if GL entries reference this centre
        $glCount = GeneralLedger::where('cost_center_id', $id)->count();
        if ($glCount > 0) {
            return $this->errorResponse("لا يمكن حذف مركز التكلفة: يوجد {$glCount} قيد محاسبي مرتبط", 422);
        }

        // Guard: prevent deletion if has children
        if ($center->children()->count() > 0) {
            return $this->errorResponse('لا يمكن حذف مركز تكلفة لديه مراكز فرعية', 422);
        }

        $oldValues = $center->toArray();
        $center->delete();

        TelescopeService::logOperation('DELETE', 'cost_centers', $id, $oldValues, null);

        return $this->successResponse([], 'تم حذف مركز التكلفة بنجاح');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PROFIT CENTERS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * List all profit centres (paginated, searchable).
     */
    public function profitCentersIndex(Request $request): JsonResponse
    {
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', $request->input('limit', 20))));

        $query = ProfitCenter::with(['parent', 'revenueAccount', 'expenseAccount', 'manager', 'createdBy', 'children']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('parent_id')) {
            $parentId = $request->input('parent_id');
            $query->where('parent_id', $parentId === 'null' ? null : $parentId);
        }

        $total = $query->count();
        $items = $query->orderBy('code', 'asc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        $items->each(function ($center) {
            $center->recorder_name       = $center->createdBy->name ?? null;
            $center->parent_name         = $center->parent->name ?? null;
            $center->revenue_account_name = $center->revenueAccount->account_name ?? null;
            $center->expense_account_name = $center->expenseAccount->account_name ?? null;
            $center->manager_name        = $center->manager->name ?? null;
            $center->children_count      = $center->children->count();

            // Revenue & expense totals from GL
            $center->actual_revenue = GeneralLedger::where('profit_center_id', $center->id)
                ->where('entry_type', 'CREDIT')
                ->sum('amount');
            $center->actual_expense = GeneralLedger::where('profit_center_id', $center->id)
                ->where('entry_type', 'DEBIT')
                ->sum('amount');
            $center->net_profit = $center->actual_revenue - $center->actual_expense;
            $center->revenue_achievement = $center->revenue_target > 0
                ? round(($center->actual_revenue / $center->revenue_target) * 100, 2)
                : 0;
        });

        return $this->paginatedResponse($items, $total, $page, $perPage);
    }

    /**
     * Get full hierarchy tree for profit centres.
     */
    public function profitCentersTree(): JsonResponse
    {
        $centers = ProfitCenter::with(['children', 'revenueAccount', 'expenseAccount'])
                    ->where('is_active', true)
                    ->whereNull('parent_id')
                    ->get();

        $tree = $this->buildTree($centers, 'profit');

        return $this->successResponse(['tree' => $tree]);
    }

    /**
     * Store a new profit centre.
     */
    public function profitCentersStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'               => 'required|string|max:20|unique:profit_centers,code',
            'name'               => 'required|string|max:255',
            'name_en'            => 'nullable|string|max:255',
            'parent_id'          => 'nullable|exists:profit_centers,id',
            'revenue_account_id' => 'nullable|exists:chart_of_accounts,id',
            'expense_account_id' => 'nullable|exists:chart_of_accounts,id',
            'manager_id'         => 'nullable|exists:employees,id',
            'revenue_target'     => 'nullable|numeric|min:0',
            'expense_budget'     => 'nullable|numeric|min:0',
            'type'               => 'nullable|in:business_unit,product_line,region,branch',
            'description'        => 'nullable|string',
            'is_active'          => 'nullable|boolean',
        ]);

        $center = ProfitCenter::create([
            ...$validated,
            'type'       => $validated['type'] ?? 'business_unit',
            'is_active'  => $validated['is_active'] ?? true,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        TelescopeService::logOperation('CREATE', 'profit_centers', $center->id, null, $validated);

        return $this->successResponse(['id' => $center->id], 'تم إنشاء مركز الربح بنجاح');
    }

    /**
     * Show a single profit centre.
     */
    public function profitCentersShow(int $id): JsonResponse
    {
        $center = ProfitCenter::with(['parent', 'revenueAccount', 'expenseAccount', 'manager', 'createdBy', 'children'])
            ->findOrFail($id);

        $center->recorder_name        = $center->createdBy->name ?? null;
        $center->parent_name          = $center->parent->name ?? null;
        $center->revenue_account_name = $center->revenueAccount->account_name ?? null;
        $center->expense_account_name = $center->expenseAccount->account_name ?? null;
        $center->manager_name         = $center->manager->name ?? null;

        $center->actual_revenue = GeneralLedger::where('profit_center_id', $center->id)
            ->where('entry_type', 'CREDIT')
            ->sum('amount');
        $center->actual_expense = GeneralLedger::where('profit_center_id', $center->id)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');
        $center->net_profit = $center->actual_revenue - $center->actual_expense;

        return $this->successResponse(['profit_center' => $center]);
    }

    /**
     * Update profit centre.
     */
    public function profitCentersUpdate(Request $request, int $id): JsonResponse
    {
        $center = ProfitCenter::findOrFail($id);

        $validated = $request->validate([
            'code'               => "required|string|max:20|unique:profit_centers,code,{$id}",
            'name'               => 'required|string|max:255',
            'name_en'            => 'nullable|string|max:255',
            'parent_id'          => 'nullable|exists:profit_centers,id',
            'revenue_account_id' => 'nullable|exists:chart_of_accounts,id',
            'expense_account_id' => 'nullable|exists:chart_of_accounts,id',
            'manager_id'         => 'nullable|exists:employees,id',
            'revenue_target'     => 'nullable|numeric|min:0',
            'expense_budget'     => 'nullable|numeric|min:0',
            'type'               => 'nullable|in:business_unit,product_line,region,branch',
            'description'        => 'nullable|string',
            'is_active'          => 'nullable|boolean',
        ]);

        if (isset($validated['parent_id']) && $validated['parent_id'] == $id) {
            return $this->errorResponse('لا يمكن تعيين المركز كأب لنفسه', 422);
        }

        $oldValues = $center->toArray();
        $center->update($validated);

        TelescopeService::logOperation('UPDATE', 'profit_centers', $center->id, $oldValues, $validated);

        return $this->successResponse([], 'تم تحديث مركز الربح بنجاح');
    }

    /**
     * Delete profit centre.
     */
    public function profitCentersDestroy(int $id): JsonResponse
    {
        $center = ProfitCenter::findOrFail($id);

        $glCount = GeneralLedger::where('profit_center_id', $id)->count();
        if ($glCount > 0) {
            return $this->errorResponse("لا يمكن حذف مركز الربح: يوجد {$glCount} قيد محاسبي مرتبط", 422);
        }

        if ($center->children()->count() > 0) {
            return $this->errorResponse('لا يمكن حذف مركز ربح لديه مراكز فرعية', 422);
        }

        $oldValues = $center->toArray();
        $center->delete();

        TelescopeService::logOperation('DELETE', 'profit_centers', $id, $oldValues, null);

        return $this->successResponse([], 'تم حذف مركز الربح بنجاح');
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANALYTICS / SUMMARY
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Dashboard-style summary: counts, totals, top centres.
     */
    public function summary(): JsonResponse
    {
        $costCenters   = CostCenter::where('is_active', true)->count();
        $profitCenters = ProfitCenter::where('is_active', true)->count();

        $totalBudget   = CostCenter::where('is_active', true)->sum('budget');
        $totalActual   = GeneralLedger::whereNotNull('cost_center_id')
                            ->where('entry_type', 'DEBIT')
                            ->sum('amount');

        $totalRevenue  = GeneralLedger::whereNotNull('profit_center_id')
                            ->where('entry_type', 'CREDIT')
                            ->sum('amount');
        $totalExpense  = GeneralLedger::whereNotNull('profit_center_id')
                            ->where('entry_type', 'DEBIT')
                            ->sum('amount');

        return $this->successResponse([
            'cost_centers_count'   => $costCenters,
            'profit_centers_count' => $profitCenters,
            'total_budget'         => (float) $totalBudget,
            'total_actual_cost'    => (float) $totalActual,
            'budget_utilization'   => $totalBudget > 0
                ? round(($totalActual / $totalBudget) * 100, 2)
                : 0,
            'total_revenue'        => (float) $totalRevenue,
            'total_expense'        => (float) $totalExpense,
            'net_profit'           => (float) ($totalRevenue - $totalExpense),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Recursively build a tree structure from a collection of centres.
     */
    private function buildTree($nodes, string $type): array
    {
        return $nodes->map(function ($node) use ($type) {
            $item = [
                'id'       => $node->id,
                'code'     => $node->code,
                'name'     => $node->name,
                'name_en'  => $node->name_en,
                'type'     => $node->type,
                'is_active'=> $node->is_active,
                'children' => [],
            ];

            if ($type === 'cost') {
                $item['account_name'] = $node->account->account_name ?? null;
                $item['budget']       = $node->budget;
            } else {
                $item['revenue_account_name'] = $node->revenueAccount->account_name ?? null;
                $item['expense_account_name'] = $node->expenseAccount->account_name ?? null;
                $item['revenue_target']       = $node->revenue_target;
                $item['expense_budget']       = $node->expense_budget;
            }

            if ($node->children->isNotEmpty()) {
                $loaded = $type === 'cost'
                    ? CostCenter::with(['children', 'account'])->where('parent_id', $node->id)->get()
                    : ProfitCenter::with(['children', 'revenueAccount', 'expenseAccount'])->where('parent_id', $node->id)->get();
                $item['children'] = $this->buildTree($loaded, $type);
            }

            return $item;
        })->toArray();
    }
}
