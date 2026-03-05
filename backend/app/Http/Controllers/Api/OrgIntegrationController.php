<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostCenter;
use App\Models\ProfitCenter;
use App\Models\StructureNode;
use App\Services\OrgIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * OrgIntegrationController
 *
 * API controller for the Organizational Integration Service.
 * Exposes endpoints for:
 *   - Syncing cost/profit centres ↔ org chart (both directions)
 *   - Opening / closing centres
 *   - Job-title bidirectional sync with positions & employees
 *   - Integration status dashboard
 */
class OrgIntegrationController extends Controller
{
    use BaseApiController;

    public function __construct(
        private readonly OrgIntegrationService $service,
    ) {}

    // ═══════════════════════════════════════════════════════════════════
    // COST / PROFIT CENTRE ↔ ORG CHART
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sync a single cost centre to the org chart.
     */
    public function syncCostCenter(int $id): JsonResponse
    {
        $center = CostCenter::findOrFail($id);
        $node   = $this->service->syncCostCenterToOrgChart($center);

        return $this->successResponse([
            'cost_center'     => $center->fresh(),
            'structure_node'  => $node,
        ], 'تم مزامنة مركز التكلفة مع الهيكل التنظيمي');
    }

    /**
     * Sync a single profit centre to the org chart.
     */
    public function syncProfitCenter(int $id): JsonResponse
    {
        $center = ProfitCenter::findOrFail($id);
        $node   = $this->service->syncProfitCenterToOrgChart($center);

        return $this->successResponse([
            'profit_center'   => $center->fresh(),
            'structure_node'  => $node,
        ], 'تم مزامنة مركز الربح مع الهيكل التنظيمي');
    }

    /**
     * Sync an org-chart node back to its cost/profit centre table.
     */
    public function syncNodeToTable(string $uuid): JsonResponse
    {
        $node = StructureNode::findOrFail($uuid);

        if ($node->node_type_id === 'COST_CENTER') {
            $center = $this->service->syncOrgNodeToCostCenter($node);
            return $this->successResponse([
                'type'          => 'cost_center',
                'cost_center'   => $center,
                'structure_node' => $node->fresh(),
            ], 'تم مزامنة عقدة الهيكل التنظيمي مع مركز التكلفة');
        }

        if ($node->node_type_id === 'PROFIT_CENTER') {
            $center = $this->service->syncOrgNodeToProfitCenter($node);
            return $this->successResponse([
                'type'          => 'profit_center',
                'profit_center' => $center,
                'structure_node' => $node->fresh(),
            ], 'تم مزامنة عقدة الهيكل التنظيمي مع مركز الربح');
        }

        return $this->errorResponse('نوع العقدة غير مدعوم للمزامنة. مطلوب COST_CENTER أو PROFIT_CENTER', 422);
    }

    // ═══════════════════════════════════════════════════════════════════
    // OPEN / CLOSE CENTRES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Open (activate) a centre.
     */
    public function openCenter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:cost,profit',
            'id'   => 'required|integer',
        ]);

        $result = $this->service->openCenter($validated['type'], $validated['id']);

        return $this->successResponse($result, 'تم فتح المركز بنجاح');
    }

    /**
     * Close (deactivate) a centre.
     */
    public function closeCenter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:cost,profit',
            'id'   => 'required|integer',
        ]);

        try {
            $result = $this->service->closeCenter($validated['type'], $validated['id']);
            return $this->successResponse($result, 'تم إغلاق المركز بنجاح');
        } catch (\RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // JOB TITLE SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sync a job title to all linked positions and employees.
     */
    public function syncJobTitle(int $id): JsonResponse
    {
        $result = $this->service->syncJobTitle($id);

        return $this->successResponse($result, 'تم مزامنة المسمى الوظيفي مع المناصب والموظفين');
    }

    /**
     * Get the organisational mapping for a job title.
     */
    public function jobTitleMapping(int $id): JsonResponse
    {
        $mapping = $this->service->getJobTitleOrgMapping($id);

        return $this->successResponse($mapping);
    }

    // ═══════════════════════════════════════════════════════════════════
    // BULK SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Bulk sync all cost centres to org chart.
     */
    public function bulkSyncCostCenters(): JsonResponse
    {
        $result = $this->service->syncAllCostCentersToOrgChart();

        return $this->successResponse($result, 'تم مزامنة جميع مراكز التكلفة');
    }

    /**
     * Bulk sync all profit centres to org chart.
     */
    public function bulkSyncProfitCenters(): JsonResponse
    {
        $result = $this->service->syncAllProfitCentersToOrgChart();

        return $this->successResponse($result, 'تم مزامنة جميع مراكز الربح');
    }

    /**
     * Bulk sync from org-chart nodes back to tables.
     */
    public function bulkSyncNodesToTables(): JsonResponse
    {
        $result = $this->service->syncAllOrgNodesToTables();

        return $this->successResponse($result, 'تم مزامنة عقد الهيكل التنظيمي مع الجداول');
    }

    /**
     * Bulk sync all job titles.
     */
    public function bulkSyncJobTitles(): JsonResponse
    {
        $result = $this->service->syncAllJobTitles();

        return $this->successResponse($result, 'تم مزامنة جميع المسميات الوظيفية');
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTEGRATION STATUS / DASHBOARD
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get integration status dashboard.
     */
    public function status(): JsonResponse
    {
        $status = $this->service->getIntegrationStatus();

        return $this->successResponse($status);
    }

    /**
     * Get detailed integration issues.
     */
    public function issues(): JsonResponse
    {
        $issues = $this->service->getIntegrationIssues();

        return $this->successResponse([
            'issues'      => $issues,
            'total_issues' => count($issues),
            'by_type'     => [
                'errors'   => collect($issues)->where('type', 'ERROR')->count(),
                'warnings' => collect($issues)->where('type', 'WARNING')->count(),
                'info'     => collect($issues)->where('type', 'INFO')->count(),
            ],
        ]);
    }
}
