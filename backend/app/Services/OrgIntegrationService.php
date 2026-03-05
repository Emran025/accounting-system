<?php

namespace App\Services;

use App\Models\CostCenter;
use App\Models\Department;
use App\Models\Employee;
use App\Models\JobTitle;
use App\Models\OrgChangeHistory;
use App\Models\OrgMetaType;
use App\Models\Position;
use App\Models\ProfitCenter;
use App\Models\StructureLink;
use App\Models\StructureNode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Organizational Integration Service
 *
 * Bridges the three organisational domains:
 *   1. Org Chart (structure_nodes / structure_links) ↔ Cost / Profit Centres
 *   2. Job Titles ↔ Positions ↔ Employees (bidirectional title sync)
 *   3. Centre open / close operations with org-chart status sync
 *
 * Every mutation records an entry in org_change_history.
 */
class OrgIntegrationService
{
    public function __construct(
        private readonly OrgStructureService $orgService,
    ) {}

    // ═══════════════════════════════════════════════════════════════════
    // COST / PROFIT CENTRE ↔ ORG CHART SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sync a cost centre to its corresponding org-chart node.
     * Creates the node if it doesn't exist, updates it otherwise.
     */
    public function syncCostCenterToOrgChart(CostCenter $center): StructureNode
    {
        return DB::transaction(function () use ($center) {
            $attributes = [
                'name'                => $center->name,
                'name_en'             => $center->name_en,
                'linked_entity_id'    => $center->id,
                'linked_entity_type'  => 'cost_center',
                'responsible_person'  => $center->manager?->full_name,
                'cost_center_category' => $center->type,
                'budget'              => $center->budget,
            ];

            if ($center->structure_node_uuid) {
                // Update existing node
                $node = StructureNode::find($center->structure_node_uuid);
                if ($node) {
                    $oldValues = $node->toArray();
                    $node->update([
                        'code'            => $center->code,
                        'attributes_json' => $attributes,
                        'status'          => $center->is_active ? 'active' : 'inactive',
                        'updated_by'      => auth()->id(),
                    ]);
                    $this->orgService->recordChange('node', $node->node_uuid, 'updated', $oldValues, $node->fresh()->toArray(), 'Synced from cost center');
                    return $node->fresh();
                }
            }

            // Create new node
            $node = StructureNode::create([
                'node_uuid'       => (string) Str::uuid(),
                'node_type_id'    => 'COST_CENTER',
                'code'            => $center->code,
                'attributes_json' => $attributes,
                'status'          => $center->is_active ? 'active' : 'inactive',
                'created_by'      => auth()->id(),
                'updated_by'      => auth()->id(),
            ]);

            // Link back
            $center->update(['structure_node_uuid' => $node->node_uuid]);

            $this->orgService->recordChange('node', $node->node_uuid, 'created', null, $node->toArray(), 'Auto-created from cost center');

            return $node;
        });
    }

    /**
     * Sync a profit centre to its corresponding org-chart node.
     */
    public function syncProfitCenterToOrgChart(ProfitCenter $center): StructureNode
    {
        return DB::transaction(function () use ($center) {
            $attributes = [
                'name'                => $center->name,
                'name_en'             => $center->name_en,
                'linked_entity_id'    => $center->id,
                'linked_entity_type'  => 'profit_center',
                'manager'             => $center->manager?->full_name,
                'profit_center_group' => $center->type,
                'revenue_target'      => $center->revenue_target,
                'expense_budget'      => $center->expense_budget,
            ];

            if ($center->structure_node_uuid) {
                $node = StructureNode::find($center->structure_node_uuid);
                if ($node) {
                    $oldValues = $node->toArray();
                    $node->update([
                        'code'            => $center->code,
                        'attributes_json' => $attributes,
                        'status'          => $center->is_active ? 'active' : 'inactive',
                        'updated_by'      => auth()->id(),
                    ]);
                    $this->orgService->recordChange('node', $node->node_uuid, 'updated', $oldValues, $node->fresh()->toArray(), 'Synced from profit center');
                    return $node->fresh();
                }
            }

            $node = StructureNode::create([
                'node_uuid'       => (string) Str::uuid(),
                'node_type_id'    => 'PROFIT_CENTER',
                'code'            => $center->code,
                'attributes_json' => $attributes,
                'status'          => $center->is_active ? 'active' : 'inactive',
                'created_by'      => auth()->id(),
                'updated_by'      => auth()->id(),
            ]);

            $center->update(['structure_node_uuid' => $node->node_uuid]);

            $this->orgService->recordChange('node', $node->node_uuid, 'created', null, $node->toArray(), 'Auto-created from profit center');

            return $node;
        });
    }

    /**
     * Sync from org-chart node back to cost centre table.
     */
    public function syncOrgNodeToCostCenter(StructureNode $node): ?CostCenter
    {
        if ($node->node_type_id !== 'COST_CENTER') {
            return null;
        }

        $linkedId = data_get($node->attributes_json, 'linked_entity_id');

        return DB::transaction(function () use ($node, $linkedId) {
            $center = $linkedId ? CostCenter::find($linkedId) : CostCenter::where('structure_node_uuid', $node->node_uuid)->first();

            if (!$center) {
                // Create the cost centre from the org-chart node
                $center = CostCenter::create([
                    'code'                => $node->code,
                    'name'                => data_get($node->attributes_json, 'name', $node->code),
                    'name_en'             => data_get($node->attributes_json, 'name_en'),
                    'type'                => data_get($node->attributes_json, 'cost_center_category', 'operational'),
                    'budget'              => data_get($node->attributes_json, 'budget'),
                    'is_active'           => $node->status === 'active',
                    'structure_node_uuid' => $node->node_uuid,
                    'created_by'          => auth()->id(),
                ]);

                $this->orgService->recordChange('cost_center', (string) $center->id, 'created', null, $center->toArray(), 'Auto-created from org-chart node');
            } else {
                $oldValues = $center->toArray();
                $center->update([
                    'code'                => $node->code,
                    'name'                => data_get($node->attributes_json, 'name', $center->name),
                    'name_en'             => data_get($node->attributes_json, 'name_en', $center->name_en),
                    'type'                => data_get($node->attributes_json, 'cost_center_category', $center->type),
                    'is_active'           => $node->status === 'active',
                    'structure_node_uuid' => $node->node_uuid,
                ]);
                $this->orgService->recordChange('cost_center', (string) $center->id, 'updated', $oldValues, $center->fresh()->toArray(), 'Synced from org-chart node');
            }

            return $center->fresh();
        });
    }

    /**
     * Sync from org-chart node back to profit centre table.
     */
    public function syncOrgNodeToProfitCenter(StructureNode $node): ?ProfitCenter
    {
        if ($node->node_type_id !== 'PROFIT_CENTER') {
            return null;
        }

        $linkedId = data_get($node->attributes_json, 'linked_entity_id');

        return DB::transaction(function () use ($node, $linkedId) {
            $center = $linkedId ? ProfitCenter::find($linkedId) : ProfitCenter::where('structure_node_uuid', $node->node_uuid)->first();

            if (!$center) {
                $center = ProfitCenter::create([
                    'code'                => $node->code,
                    'name'                => data_get($node->attributes_json, 'name', $node->code),
                    'name_en'             => data_get($node->attributes_json, 'name_en'),
                    'type'                => data_get($node->attributes_json, 'profit_center_group', 'business_unit'),
                    'revenue_target'      => data_get($node->attributes_json, 'revenue_target'),
                    'expense_budget'      => data_get($node->attributes_json, 'expense_budget'),
                    'is_active'           => $node->status === 'active',
                    'structure_node_uuid' => $node->node_uuid,
                    'created_by'          => auth()->id(),
                ]);
                $this->orgService->recordChange('profit_center', (string) $center->id, 'created', null, $center->toArray(), 'Auto-created from org-chart node');
            } else {
                $oldValues = $center->toArray();
                $center->update([
                    'code'                => $node->code,
                    'name'                => data_get($node->attributes_json, 'name', $center->name),
                    'name_en'             => data_get($node->attributes_json, 'name_en', $center->name_en),
                    'type'                => data_get($node->attributes_json, 'profit_center_group', $center->type),
                    'is_active'           => $node->status === 'active',
                    'structure_node_uuid' => $node->node_uuid,
                ]);
                $this->orgService->recordChange('profit_center', (string) $center->id, 'updated', $oldValues, $center->fresh()->toArray(), 'Synced from org-chart node');
            }

            return $center->fresh();
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // CENTRE OPEN / CLOSE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Open (activate) a cost or profit centre, syncing status to org-chart.
     *
     * @param  string  $type  'cost' | 'profit'
     * @param  int     $id
     * @return array   Result with the updated centre and optional node
     */
    public function openCenter(string $type, int $id): array
    {
        return DB::transaction(function () use ($type, $id) {
            if ($type === 'cost') {
                $center = CostCenter::findOrFail($id);
                $oldValues = $center->toArray();
                $center->update(['is_active' => true]);
                $this->orgService->recordChange('cost_center', (string) $id, 'opened', $oldValues, ['is_active' => true], 'Centre opened');

                $node = null;
                if ($center->structure_node_uuid) {
                    $node = StructureNode::find($center->structure_node_uuid);
                    if ($node && $node->status !== 'active') {
                        $nodeOld = ['status' => $node->status];
                        $node->update(['status' => 'active', 'updated_by' => auth()->id()]);
                        $this->orgService->recordChange('node', $node->node_uuid, 'status_change', $nodeOld, ['status' => 'active'], 'Centre opened — synced');
                    }
                }

                return ['center' => $center->fresh(), 'node' => $node?->fresh(), 'type' => 'cost'];
            }

            // Profit centre
            $center = ProfitCenter::findOrFail($id);
            $oldValues = $center->toArray();
            $center->update(['is_active' => true]);
            $this->orgService->recordChange('profit_center', (string) $id, 'opened', $oldValues, ['is_active' => true], 'Centre opened');

            $node = null;
            if ($center->structure_node_uuid) {
                $node = StructureNode::find($center->structure_node_uuid);
                if ($node && $node->status !== 'active') {
                    $nodeOld = ['status' => $node->status];
                    $node->update(['status' => 'active', 'updated_by' => auth()->id()]);
                    $this->orgService->recordChange('node', $node->node_uuid, 'status_change', $nodeOld, ['status' => 'active'], 'Centre opened — synced');
                }
            }

            return ['center' => $center->fresh(), 'node' => $node?->fresh(), 'type' => 'profit'];
        });
    }

    /**
     * Close (deactivate) a cost or profit centre, syncing status to org-chart.
     */
    public function closeCenter(string $type, int $id): array
    {
        return DB::transaction(function () use ($type, $id) {
            if ($type === 'cost') {
                $center = CostCenter::findOrFail($id);

                // Guard: cannot close if children are still open
                if ($center->children()->where('is_active', true)->exists()) {
                    throw new \RuntimeException('لا يمكن إغلاق مركز تكلفة لديه مراكز فرعية مفتوحة');
                }

                $oldValues = $center->toArray();
                $center->update(['is_active' => false]);
                $this->orgService->recordChange('cost_center', (string) $id, 'closed', $oldValues, ['is_active' => false], 'Centre closed');

                $node = null;
                if ($center->structure_node_uuid) {
                    $node = StructureNode::find($center->structure_node_uuid);
                    if ($node && $node->status === 'active') {
                        $nodeOld = ['status' => $node->status];
                        $node->update(['status' => 'inactive', 'updated_by' => auth()->id()]);
                        $this->orgService->recordChange('node', $node->node_uuid, 'status_change', $nodeOld, ['status' => 'inactive'], 'Centre closed — synced');
                    }
                }

                return ['center' => $center->fresh(), 'node' => $node?->fresh(), 'type' => 'cost'];
            }

            // Profit centre
            $center = ProfitCenter::findOrFail($id);

            if ($center->children()->where('is_active', true)->exists()) {
                throw new \RuntimeException('لا يمكن إغلاق مركز ربح لديه مراكز فرعية مفتوحة');
            }

            $oldValues = $center->toArray();
            $center->update(['is_active' => false]);
            $this->orgService->recordChange('profit_center', (string) $id, 'closed', $oldValues, ['is_active' => false], 'Centre closed');

            $node = null;
            if ($center->structure_node_uuid) {
                $node = StructureNode::find($center->structure_node_uuid);
                if ($node && $node->status === 'active') {
                    $nodeOld = ['status' => $node->status];
                    $node->update(['status' => 'inactive', 'updated_by' => auth()->id()]);
                    $this->orgService->recordChange('node', $node->node_uuid, 'status_change', $nodeOld, ['status' => 'inactive'], 'Centre closed — synced');
                }
            }

            return ['center' => $center->fresh(), 'node' => $node?->fresh(), 'type' => 'profit'];
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // JOB TITLE ↔ POSITIONS ↔ EMPLOYEES SYNC
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Propagate a job-title change to all linked positions.
     * Returns the count of positions updated.
     */
    public function syncJobTitleToPositions(JobTitle $jobTitle): int
    {
        return DB::transaction(function () use ($jobTitle) {
            $positions = Position::where('job_title_id', $jobTitle->id)->get();
            $count = 0;

            foreach ($positions as $position) {
                $oldValues = $position->toArray();
                $changes = [];

                // Sync the position name from the job title if they share the same base
                if ($jobTitle->title_ar && $position->position_name_ar !== $jobTitle->title_ar) {
                    $changes['position_name_ar'] = $jobTitle->title_ar;
                }
                if ($jobTitle->title_en && $position->position_name_en !== $jobTitle->title_en) {
                    $changes['position_name_en'] = $jobTitle->title_en;
                }

                // Sync department from job title if the job title has one and position hasn't been manually customised
                if ($jobTitle->department_id && !$position->department_id) {
                    $changes['department_id'] = $jobTitle->department_id;
                }

                if (!empty($changes)) {
                    $position->update($changes);
                    $this->orgService->recordChange(
                        'position',
                        (string) $position->id,
                        'updated',
                        $oldValues,
                        $position->fresh()->toArray(),
                        'Synced from job title update'
                    );
                    $count++;
                }
            }

            return $count;
        });
    }

    /**
     * Propagate a job-title change to all employees holding that title.
     * This updates the employee records to reflect the current title data.
     * Returns the count of employees updated.
     */
    public function syncJobTitleToEmployees(JobTitle $jobTitle): int
    {
        return DB::transaction(function () use ($jobTitle) {
            // Employees linked directly via job_title_id
            $directEmployees = Employee::where('job_title_id', $jobTitle->id)->get();

            // Employees linked via position → job_title
            $positionIds = Position::where('job_title_id', $jobTitle->id)->pluck('id');
            $positionEmployees = Employee::whereIn('position_id', $positionIds)
                ->where('job_title_id', '!=', $jobTitle->id)
                ->get();

            $count = 0;

            // For position-linked employees, ensure their job_title_id matches
            foreach ($positionEmployees as $employee) {
                $oldValues = ['job_title_id' => $employee->job_title_id];
                $employee->update(['job_title_id' => $jobTitle->id]);
                $this->orgService->recordChange(
                    'employee',
                    (string) $employee->id,
                    'updated',
                    $oldValues,
                    ['job_title_id' => $jobTitle->id],
                    'Job title synced from position'
                );
                $count++;
            }

            // If the job title's department changed, optionally sync to employees
            if ($jobTitle->wasChanged('department_id') && $jobTitle->department_id) {
                foreach ($directEmployees as $employee) {
                    if ($employee->department_id !== $jobTitle->department_id) {
                        $oldDept = ['department_id' => $employee->department_id];
                        $employee->update(['department_id' => $jobTitle->department_id]);
                        $this->orgService->recordChange(
                            'employee',
                            (string) $employee->id,
                            'updated',
                            $oldDept,
                            ['department_id' => $jobTitle->department_id],
                            'Department synced from job title update'
                        );
                        $count++;
                    }
                }
            }

            return $count;
        });
    }

    /**
     * Get a complete mapping of where a job title appears across the system.
     */
    public function getJobTitleOrgMapping(int $jobTitleId): array
    {
        $jobTitle = JobTitle::with(['department', 'positions.department', 'employees'])->findOrFail($jobTitleId);

        $positions = $jobTitle->positions->map(fn(Position $p) => [
            'id'              => $p->id,
            'position_code'   => $p->position_code,
            'position_name_ar' => $p->position_name_ar,
            'position_name_en' => $p->position_name_en,
            'department'      => $p->department?->name_ar,
            'is_active'       => $p->is_active,
            'employee_count'  => $p->employees()->where('is_active', true)->count(),
        ]);

        $employees = Employee::where('job_title_id', $jobTitleId)
            ->where('is_active', true)
            ->select('id', 'employee_code', 'full_name', 'department_id', 'position_id')
            ->with(['department:id,name_ar', 'position:id,position_code,position_name_ar'])
            ->get();

        // Find org-chart nodes that reference positions under this title
        $positionIds = $jobTitle->positions->pluck('id');
        $orgNodes = StructureNode::where('node_type_id', 'POSITION')
            ->whereIn(DB::raw("JSON_EXTRACT(attributes_json, '$.linked_entity_id')"), $positionIds)
            ->get();

        return [
            'job_title' => [
                'id'       => $jobTitle->id,
                'title_ar' => $jobTitle->title_ar,
                'title_en' => $jobTitle->title_en,
                'department' => $jobTitle->department?->name_ar,
                'is_active' => $jobTitle->is_active,
            ],
            'positions'        => $positions,
            'employees'        => $employees,
            'org_chart_nodes'  => $orgNodes->map(fn($n) => [
                'node_uuid' => $n->node_uuid,
                'code'      => $n->code,
                'status'    => $n->status,
            ]),
            'summary' => [
                'total_positions'     => $positions->count(),
                'total_employees'     => $employees->count(),
                'total_org_nodes'     => $orgNodes->count(),
                'active_positions'    => $positions->where('is_active', true)->count(),
            ],
        ];
    }

    /**
     * Full bidirectional sync of a job title: updates positions AND employees.
     */
    public function syncJobTitle(int $jobTitleId): array
    {
        $jobTitle = JobTitle::findOrFail($jobTitleId);

        $positionsUpdated = $this->syncJobTitleToPositions($jobTitle);
        $employeesUpdated = $this->syncJobTitleToEmployees($jobTitle);

        return [
            'job_title_id'      => $jobTitleId,
            'positions_updated' => $positionsUpdated,
            'employees_updated' => $employeesUpdated,
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // BULK SYNC OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Sync ALL cost centres to the org chart.
     */
    public function syncAllCostCentersToOrgChart(): array
    {
        $centers  = CostCenter::all();
        $synced   = 0;
        $errors   = [];

        foreach ($centers as $center) {
            try {
                $this->syncCostCenterToOrgChart($center);
                $synced++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'id'      => $center->id,
                    'code'    => $center->code,
                    'error'   => $e->getMessage(),
                ];
            }
        }

        return ['synced' => $synced, 'total' => $centers->count(), 'errors' => $errors];
    }

    /**
     * Sync ALL profit centres to the org chart.
     */
    public function syncAllProfitCentersToOrgChart(): array
    {
        $centers  = ProfitCenter::all();
        $synced   = 0;
        $errors   = [];

        foreach ($centers as $center) {
            try {
                $this->syncProfitCenterToOrgChart($center);
                $synced++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'id'      => $center->id,
                    'code'    => $center->code,
                    'error'   => $e->getMessage(),
                ];
            }
        }

        return ['synced' => $synced, 'total' => $centers->count(), 'errors' => $errors];
    }

    /**
     * Sync ALL org-chart nodes of type COST_CENTER / PROFIT_CENTER back to their tables.
     */
    public function syncAllOrgNodesToTables(): array
    {
        $costNodes   = StructureNode::where('node_type_id', 'COST_CENTER')->get();
        $profitNodes = StructureNode::where('node_type_id', 'PROFIT_CENTER')->get();

        $results = ['cost_synced' => 0, 'profit_synced' => 0, 'errors' => []];

        foreach ($costNodes as $node) {
            try {
                $this->syncOrgNodeToCostCenter($node);
                $results['cost_synced']++;
            } catch (\Throwable $e) {
                $results['errors'][] = ['node_uuid' => $node->node_uuid, 'error' => $e->getMessage()];
            }
        }

        foreach ($profitNodes as $node) {
            try {
                $this->syncOrgNodeToProfitCenter($node);
                $results['profit_synced']++;
            } catch (\Throwable $e) {
                $results['errors'][] = ['node_uuid' => $node->node_uuid, 'error' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * Sync ALL job titles to their positions and employees.
     */
    public function syncAllJobTitles(): array
    {
        $titles = JobTitle::where('is_active', true)->get();
        $totalPositions = 0;
        $totalEmployees = 0;

        foreach ($titles as $title) {
            $totalPositions += $this->syncJobTitleToPositions($title);
            $totalEmployees += $this->syncJobTitleToEmployees($title);
        }

        return [
            'job_titles_processed' => $titles->count(),
            'positions_updated'    => $totalPositions,
            'employees_updated'    => $totalEmployees,
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // INTEGRATION STATUS / DASHBOARD
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get overall integration health across all three domains.
     */
    public function getIntegrationStatus(): array
    {
        // Cost centres
        $totalCostCenters  = CostCenter::count();
        $linkedCostCenters = CostCenter::whereNotNull('structure_node_uuid')->count();
        $activeCostCenters = CostCenter::where('is_active', true)->count();

        // Profit centres
        $totalProfitCenters  = ProfitCenter::count();
        $linkedProfitCenters = ProfitCenter::whereNotNull('structure_node_uuid')->count();
        $activeProfitCenters = ProfitCenter::where('is_active', true)->count();

        // Org-chart nodes that are COST_CENTER / PROFIT_CENTER
        $orgCostNodes   = StructureNode::where('node_type_id', 'COST_CENTER')->count();
        $orgProfitNodes = StructureNode::where('node_type_id', 'PROFIT_CENTER')->count();

        // Job titles
        $totalJobTitles    = JobTitle::count();
        $activeJobTitles   = JobTitle::where('is_active', true)->count();
        $totalPositions    = Position::count();
        $activePositions   = Position::where('is_active', true)->count();
        $employeesWithTitle = Employee::whereNotNull('job_title_id')->where('is_active', true)->count();
        $employeesWithPosition = Employee::whereNotNull('position_id')->where('is_active', true)->count();

        // Mismatches — employees whose position job_title_id doesn't match their own
        $mismatches = Employee::whereNotNull('position_id')
            ->whereNotNull('job_title_id')
            ->where('is_active', true)
            ->whereHas('position', function ($q) {
                $q->whereColumn('positions.job_title_id', '!=', 'employees.job_title_id');
            })
            ->count();

        // Unlinked cost/profit centres (exist in table but not in org chart)
        $unlinkedCostCenters  = $totalCostCenters - $linkedCostCenters;
        $unlinkedProfitCenters = $totalProfitCenters - $linkedProfitCenters;

        return [
            'cost_centers' => [
                'total'    => $totalCostCenters,
                'active'   => $activeCostCenters,
                'closed'   => $totalCostCenters - $activeCostCenters,
                'linked'   => $linkedCostCenters,
                'unlinked' => $unlinkedCostCenters,
                'org_nodes' => $orgCostNodes,
            ],
            'profit_centers' => [
                'total'    => $totalProfitCenters,
                'active'   => $activeProfitCenters,
                'closed'   => $totalProfitCenters - $activeProfitCenters,
                'linked'   => $linkedProfitCenters,
                'unlinked' => $unlinkedProfitCenters,
                'org_nodes' => $orgProfitNodes,
            ],
            'job_titles' => [
                'total'                 => $totalJobTitles,
                'active'                => $activeJobTitles,
                'total_positions'       => $totalPositions,
                'active_positions'      => $activePositions,
                'employees_with_title'  => $employeesWithTitle,
                'employees_with_position' => $employeesWithPosition,
                'mismatches'            => $mismatches,
            ],
            'health' => [
                'is_healthy'         => $unlinkedCostCenters === 0 && $unlinkedProfitCenters === 0 && $mismatches === 0,
                'unlinked_centers'   => $unlinkedCostCenters + $unlinkedProfitCenters,
                'title_mismatches'   => $mismatches,
            ],
        ];
    }

    /**
     * Get detailed list of integration issues that need attention.
     */
    public function getIntegrationIssues(): array
    {
        $issues = [];

        // 1. Cost centres without org-chart node
        $unlinkedCost = CostCenter::whereNull('structure_node_uuid')->get();
        foreach ($unlinkedCost as $cc) {
            $issues[] = [
                'type'       => 'WARNING',
                'category'   => 'unlinked_cost_center',
                'message'    => "Cost center {$cc->code} ({$cc->name}) is not linked to org chart",
                'message_ar' => "مركز التكلفة {$cc->code} ({$cc->name}) غير مرتبط بالهيكل التنظيمي",
                'entity_type' => 'cost_center',
                'entity_id'  => $cc->id,
            ];
        }

        // 2. Profit centres without org-chart node
        $unlinkedProfit = ProfitCenter::whereNull('structure_node_uuid')->get();
        foreach ($unlinkedProfit as $pc) {
            $issues[] = [
                'type'       => 'WARNING',
                'category'   => 'unlinked_profit_center',
                'message'    => "Profit center {$pc->code} ({$pc->name}) is not linked to org chart",
                'message_ar' => "مركز الربح {$pc->code} ({$pc->name}) غير مرتبط بالهيكل التنظيمي",
                'entity_type' => 'profit_center',
                'entity_id'  => $pc->id,
            ];
        }

        // 3. Job title → position mismatches
        $mismatchedEmployees = Employee::whereNotNull('position_id')
            ->whereNotNull('job_title_id')
            ->where('is_active', true)
            ->with(['position:id,position_code,job_title_id', 'jobTitle:id,title_ar'])
            ->get()
            ->filter(function ($emp) {
                return $emp->position && $emp->position->job_title_id !== $emp->job_title_id;
            });

        foreach ($mismatchedEmployees as $emp) {
            $issues[] = [
                'type'       => 'ERROR',
                'category'   => 'title_mismatch',
                'message'    => "Employee {$emp->employee_code} has job_title_id={$emp->job_title_id} but position {$emp->position->position_code} has job_title_id={$emp->position->job_title_id}",
                'message_ar' => "الموظف {$emp->employee_code} يحمل مسمى وظيفي مختلف عن مسمى المنصب {$emp->position->position_code}",
                'entity_type' => 'employee',
                'entity_id'  => $emp->id,
            ];
        }

        // 4. Status mismatch between centre table and org node
        $linkedCenters = CostCenter::whereNotNull('structure_node_uuid')->get();
        foreach ($linkedCenters as $cc) {
            $node = StructureNode::find($cc->structure_node_uuid);
            if ($node) {
                $nodeActive = $node->status === 'active';
                if ($cc->is_active !== $nodeActive) {
                    $issues[] = [
                        'type'       => 'WARNING',
                        'category'   => 'status_mismatch',
                        'message'    => "Cost center {$cc->code} is_active={$cc->is_active} but org node status={$node->status}",
                        'message_ar' => "حالة مركز التكلفة {$cc->code} غير متطابقة مع عقدة الهيكل التنظيمي",
                        'entity_type' => 'cost_center',
                        'entity_id'  => $cc->id,
                    ];
                }
            }
        }

        $linkedProfits = ProfitCenter::whereNotNull('structure_node_uuid')->get();
        foreach ($linkedProfits as $pc) {
            $node = StructureNode::find($pc->structure_node_uuid);
            if ($node) {
                $nodeActive = $node->status === 'active';
                if ($pc->is_active !== $nodeActive) {
                    $issues[] = [
                        'type'       => 'WARNING',
                        'category'   => 'status_mismatch',
                        'message'    => "Profit center {$pc->code} is_active={$pc->is_active} but org node status={$node->status}",
                        'message_ar' => "حالة مركز الربح {$pc->code} غير متطابقة مع عقدة الهيكل التنظيمي",
                        'entity_type' => 'profit_center',
                        'entity_id'  => $pc->id,
                    ];
                }
            }
        }

        return $issues;
    }
}
