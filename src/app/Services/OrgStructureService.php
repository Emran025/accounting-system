<?php

namespace App\Services;

use App\Models\OrgChangeHistory;
use App\Models\OrgMetaType;
use App\Models\StructureLink;
use App\Models\StructureNode;
use App\Models\TopologyRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Organizational Structure Configuration Engine (SAP SPRO-style).
 * Handles node creation, linking, deletion validation, scope resolution,
 * cardinality enforcement, change history, integrity checking, and statistics.
 */
class OrgStructureService
{
    // ─── Change History ─────────────────────────────────────────────────

    /**
     * Record a change in the org change history (SAP Change Document equivalent).
     */
    public function recordChange(
        string $entityType,
        string $entityId,
        string $changeType,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $reason = null
    ): OrgChangeHistory {
        return OrgChangeHistory::create([
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'change_type' => $changeType,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'change_reason' => $reason,
            'changed_by' => auth()->id(),
        ]);
    }

    /**
     * Get change history for an entity.
     */
    public function getChangeHistory(string $entityType, string $entityId): \Illuminate\Database\Eloquent\Collection
    {
        return OrgChangeHistory::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->with('changedByUser')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Get all recent changes across the org structure.
     */
    public function getRecentChanges(int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return OrgChangeHistory::with('changedByUser')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    // ─── Node Validation ────────────────────────────────────────────────

    /**
     * Check if a node can be deleted (no dependent children).
     * @return array{allowed: bool, reason: ?string}
     */
    public function canDeleteNode(string $nodeUuid): array
    {
        $node = StructureNode::find($nodeUuid);

        if (!$node) {
            return ['allowed' => false, 'reason' => 'Node not found.'];
        }

        $dependentRules = TopologyRule::where('target_node_type_id', $node->node_type_id)
            ->where('is_active', true)
            ->get();

        foreach ($dependentRules as $rule) {
            $childCount = StructureLink::where('target_node_uuid', $nodeUuid)
                ->whereHas('sourceNode', function ($q) use ($rule) {
                    $q->where('node_type_id', $rule->source_node_type_id);
                })
                ->where(function ($q) {
                    $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
                })
                ->count();

            if ($childCount > 0) {
                $sourceLabel = OrgMetaType::find($rule->source_node_type_id)?->display_name ?? $rule->source_node_type_id;
                return [
                    'allowed' => false,
                    'reason' => "Cannot delete. {$childCount} {$sourceLabel}(s) are still assigned.",
                ];
            }
        }

        return ['allowed' => true, 'reason' => null];
    }

    /**
     * Validate node attributes against meta type requirements.
     * @throws ValidationException
     */
    public function validateNodeAttributes(string $nodeTypeId, array $attributes): void
    {
        $metaType = OrgMetaType::findOrFail($nodeTypeId);
        $mandatory = $metaType->getMandatoryAttributes();
        $errors = [];

        foreach ($mandatory as $key) {
            $value = data_get($attributes, $key);
            if ($value === null || $value === '') {
                $errors[] = "Mandatory attribute '{$key}' is missing.";
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages(['attributes' => $errors]);
        }
    }

    // ─── Topology & Cardinality ─────────────────────────────────────────

    /**
     * Find topology rule for source->target link.
     */
    public function findTopologyRule(string $sourceTypeId, string $targetTypeId): ?TopologyRule
    {
        return TopologyRule::where('source_node_type_id', $sourceTypeId)
            ->where('target_node_type_id', $targetTypeId)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Evaluate constraint logic (e.g. attribute_match: country_code must match).
     * @throws ValidationException
     */
    public function evaluateConstraintLogic(TopologyRule $rule, StructureNode $source, StructureNode $target): void
    {
        $logic = $rule->constraint_logic ?? [];
        $rules = $logic['rules'] ?? [];

        foreach ($rules as $r) {
            if (($r['type'] ?? '') === 'attribute_match') {
                $sourceVal = $source->getOrgAttribute($r['source_attr'] ?? '');
                $targetVal = $target->getOrgAttribute($r['target_attr'] ?? '');
                $op = $r['operator'] ?? 'eq';

                $match = match ($op) {
                    'eq' => $sourceVal == $targetVal,
                    'neq' => $sourceVal != $targetVal,
                    default => $sourceVal == $targetVal,
                };

                if (!$match) {
                    throw ValidationException::withMessages([
                        'constraint' => ["Constraint failed: {$r['source_attr']} must match {$r['target_attr']}."],
                    ]);
                }
            }
        }
    }

    /**
     * Enforce cardinality rules before creating a link.
     * @throws ValidationException
     */
    public function enforceCardinality(TopologyRule $rule, string $sourceUuid, string $targetUuid): void
    {
        $cardinality = $rule->cardinality; // 1:1, 1:N, N:1, N:M

        $activeFilter = function ($q) {
            $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
        };

        // Check LEFT side cardinality (source)
        if (str_starts_with($cardinality, '1:')) {
            // source can link to at most 1 target of this type
            $existingSourceLinks = StructureLink::where('source_node_uuid', $sourceUuid)
                ->where('topology_rule_id', $rule->id)
                ->where(function ($q) use ($activeFilter) { $activeFilter($q); })
                ->count();

            if ($existingSourceLinks > 0) {
                throw ValidationException::withMessages([
                    'cardinality' => ["Cardinality violation: Source node already has a {$cardinality} link for this rule. Only 1 is allowed."],
                ]);
            }
        }

        // Check RIGHT side cardinality (target)
        if (str_ends_with($cardinality, ':1')) {
            // target can receive from at most 1 source of this type — but wait, N:1 means N sources to 1 target
            // Actually: N:1 means many sources can link to one target — no target cardinality limit
            // 1:1 means only 1 source to 1 target — target can only have 1 incoming of this rule
            if ($cardinality === '1:1') {
                $existingTargetLinks = StructureLink::where('target_node_uuid', $targetUuid)
                    ->where('topology_rule_id', $rule->id)
                    ->where(function ($q) use ($activeFilter) { $activeFilter($q); })
                    ->count();

                if ($existingTargetLinks > 0) {
                    throw ValidationException::withMessages([
                        'cardinality' => ["Cardinality violation: Target node already has a 1:1 link for this rule."],
                    ]);
                }
            }
        }
    }

    // ─── Node + Link Creation ───────────────────────────────────────────

    /**
     * Create a node with optional link to a target (create_with_link flow).
     * @return array{node: StructureNode, link: ?StructureLink}
     */
    public function createNodeWithLink(array $nodeData, ?array $linkData = null): array
    {
        return DB::transaction(function () use ($nodeData, $linkData) {
            $this->validateNodeAttributes(
                $nodeData['node_type_id'],
                $nodeData['attributes'] ?? []
            );

            $node = StructureNode::create([
                'node_type_id' => $nodeData['node_type_id'],
                'code' => $nodeData['code'],
                'attributes_json' => $nodeData['attributes'] ?? [],
                'status' => $nodeData['status'] ?? 'active',
                'valid_from' => $nodeData['valid_from'] ?? null,
                'valid_to' => $nodeData['valid_to'] ?? null,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            // Record change history
            $this->recordChange('node', $node->node_uuid, 'created', null, $node->toArray());

            $link = null;

            if ($linkData && !empty($linkData['target_node_uuid'])) {
                $target = StructureNode::findOrFail($linkData['target_node_uuid']);
                $rule = $this->findTopologyRule($node->node_type_id, $target->node_type_id);

                if (!$rule) {
                    throw ValidationException::withMessages([
                        'link' => ['No topology rule exists for this source->target relationship.'],
                    ]);
                }

                $this->enforceCardinality($rule, $node->node_uuid, $target->node_uuid);

                if (!empty($linkData['validate_constraints'])) {
                    $this->evaluateConstraintLogic($rule, $node, $target);
                }

                $link = StructureLink::create([
                    'source_node_uuid' => $node->node_uuid,
                    'target_node_uuid' => $target->node_uuid,
                    'topology_rule_id' => $rule->id,
                    'link_type' => $linkData['link_type'] ?? 'assignment',
                    'priority' => $linkData['priority'] ?? 0,
                    'valid_from' => $linkData['valid_from'] ?? null,
                    'valid_to' => $linkData['valid_to'] ?? null,
                    'created_by' => auth()->id(),
                ]);

                $this->recordChange('link', (string) $link->id, 'created', null, $link->toArray());
            }

            return ['node' => $node->fresh(['metaType']), 'link' => $link ? $link->fresh() : null];
        });
    }

    /**
     * Create a link between existing nodes.
     * @throws ValidationException
     */
    public function createLink(string $sourceUuid, string $targetUuid, array $data = []): StructureLink
    {
        $source = StructureNode::findOrFail($sourceUuid);
        $target = StructureNode::findOrFail($targetUuid);

        if ($sourceUuid === $targetUuid) {
            throw ValidationException::withMessages(['link' => ['Source and target cannot be the same node.']]);
        }

        $rule = $this->findTopologyRule($source->node_type_id, $target->node_type_id);
        if (!$rule) {
            throw ValidationException::withMessages([
                'link' => ['No topology rule exists for this relationship.'],
            ]);
        }

        $exists = StructureLink::where('source_node_uuid', $sourceUuid)
            ->where('target_node_uuid', $targetUuid)
            ->where('link_type', $data['link_type'] ?? 'assignment')
            ->where(function ($q) {
                $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
            })
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['link' => ['Link already exists.']]);
        }

        $this->enforceCardinality($rule, $sourceUuid, $targetUuid);
        $this->evaluateConstraintLogic($rule, $source, $target);

        $link = StructureLink::create([
            'source_node_uuid' => $sourceUuid,
            'target_node_uuid' => $targetUuid,
            'topology_rule_id' => $rule->id,
            'link_type' => $data['link_type'] ?? 'assignment',
            'priority' => $data['priority'] ?? 0,
            'valid_from' => $data['valid_from'] ?? null,
            'valid_to' => $data['valid_to'] ?? null,
            'created_by' => auth()->id(),
        ]);

        $this->recordChange('link', (string) $link->id, 'created', null, $link->toArray());

        return $link;
    }

    // ─── Scope Context Resolution ───────────────────────────────────────

    /**
     * Resolve scope context for an anchor node.
     */
    public function resolveScopeContext(string $anchorNodeUuid): array
    {
        $node = StructureNode::find($anchorNodeUuid);
        if (!$node || $node->status !== 'active') {
            return [];
        }

        $result = [
            'anchor' => [
                'node_uuid' => $node->node_uuid,
                'node_type_id' => $node->node_type_id,
                'code' => $node->code,
                'attributes' => $node->attributes_json ?? [],
            ],
            'resolved' => [],
        ];

        $visited = [];
        $queue = collect([['node' => $node, 'depth' => 0]]);
        $maxDepth = 10;

        while ($queue->isNotEmpty() && $queue->first()['depth'] < $maxDepth) {
            $item = $queue->shift();
            $current = $item['node'];
            $depth = $item['depth'];

            if (in_array($current->node_uuid, $visited)) {
                continue;
            }
            $visited[] = $current->node_uuid;

            $result['resolved'][$current->node_type_id] = [
                'node_uuid' => $current->node_uuid,
                'code' => $current->code,
                'attributes' => $current->attributes_json ?? [],
            ];

            $parents = StructureLink::where('source_node_uuid', $current->node_uuid)
                ->where(function ($q) {
                    $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
                })
                ->with('targetNode')
                ->get();

            foreach ($parents as $link) {
                $target = $link->targetNode;
                if ($target && $target->status === 'active' && !in_array($target->node_uuid, $visited)) {
                    $queue->push(['node' => $target, 'depth' => $depth + 1]);
                }
            }
        }

        return $result;
    }

    // ─── Statistics & Dashboard ─────────────────────────────────────────

    /**
     * Get comprehensive statistics for the organizational structure.
     */
    public function getStatistics(): array
    {
        $totalNodes = StructureNode::count();
        $activeNodes = StructureNode::where('status', 'active')->count();
        $inactiveNodes = StructureNode::where('status', 'inactive')->count();
        $archivedNodes = StructureNode::where('status', 'archived')->count();
        $totalLinks = StructureLink::count();
        $activeLinks = StructureLink::where(function ($q) {
            $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
        })->count();
        $totalRules = TopologyRule::where('is_active', true)->count();
        $totalMetaTypes = OrgMetaType::count();

        // Domain breakdown
        $domainBreakdown = StructureNode::select('org_meta_types.level_domain')
            ->selectRaw('COUNT(*) as count')
            ->join('org_meta_types', 'structure_nodes.node_type_id', '=', 'org_meta_types.id')
            ->groupBy('org_meta_types.level_domain')
            ->pluck('count', 'level_domain')
            ->toArray();

        // Type breakdown
        $typeBreakdown = StructureNode::select('node_type_id')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('node_type_id')
            ->pluck('count', 'node_type_id')
            ->toArray();

        // Orphan count (nodes with no outgoing or incoming links —  excluding CLIENT which is root)
        $linkedSources = StructureLink::pluck('source_node_uuid')->toArray();
        $linkedTargets = StructureLink::pluck('target_node_uuid')->toArray();
        $linkedNodeUuids = array_unique(array_merge($linkedSources, $linkedTargets));

        $orphanCount = StructureNode::where('node_type_id', '!=', 'CLIENT')
            ->whereNotIn('node_uuid', $linkedNodeUuids)
            ->count();

        // Recent changes count
        $recentChanges = OrgChangeHistory::where('created_at', '>=', now()->subDays(7))->count();

        return [
            'total_nodes' => $totalNodes,
            'active_nodes' => $activeNodes,
            'inactive_nodes' => $inactiveNodes,
            'archived_nodes' => $archivedNodes,
            'total_links' => $totalLinks,
            'active_links' => $activeLinks,
            'total_rules' => $totalRules,
            'total_meta_types' => $totalMetaTypes,
            'domain_breakdown' => $domainBreakdown,
            'type_breakdown' => $typeBreakdown,
            'orphan_count' => $orphanCount,
            'recent_changes_7d' => $recentChanges,
            'health_status' => [
                'orphans' => $orphanCount,
                'is_healthy' => $orphanCount === 0,
            ]
        ];
    }

    // ─── Integrity Checks ──────────────────────────────────────────────

    /**
     * Run a comprehensive integrity scan across the org structure.
     * Returns issues array categorized as ERROR, WARNING, INFO.
     */
    public function runIntegrityCheck(): array
    {
        $issues = [];
        $nodes = StructureNode::with(['metaType.attributes', 'outgoingLinks.targetNode', 'incomingLinks.sourceNode'])->get();
        $rules = TopologyRule::where('is_active', true)->get();

        // 1. Missing mandatory attributes
        foreach ($nodes as $node) {
            if (!$node->metaType) continue;
            foreach ($node->metaType->attributes ?? [] as $attr) {
                if ($attr->is_mandatory) {
                    $val = data_get($node->attributes_json ?? [], $attr->attribute_key);
                    if ($val === null || $val === '') {
                        $issues[] = [
                            'type' => 'ERROR',
                            'category' => 'missing_attribute',
                            'message' => "Missing mandatory attribute: {$attr->attribute_key}",
                            'message_ar' => "سمة إجبارية مفقودة: {$attr->attribute_key}",
                            'node_uuid' => $node->node_uuid,
                            'node_code' => $node->code,
                            'node_type' => $node->node_type_id,
                        ];
                    }
                }
            }
        }

        // 2. Orphan nodes (no connections, excluding CLIENT)
        foreach ($nodes as $node) {
            if ($node->node_type_id === 'CLIENT') continue;
            $hasOut = $node->outgoingLinks->count() > 0;
            $hasIn = $node->incomingLinks->count() > 0;
            if (!$hasOut && !$hasIn) {
                $issues[] = [
                    'type' => 'WARNING',
                    'category' => 'orphan_node',
                    'message' => "Orphan node: not linked to any other unit",
                    'message_ar' => "وحدة معزولة: غير مرتبطة بأي وحدة أخرى",
                    'node_uuid' => $node->node_uuid,
                    'node_code' => $node->code,
                    'node_type' => $node->node_type_id,
                ];
            }
        }

        // 3. Required parent check — key types must have parent links
        $requiredParentMap = [
            'PLANT' => 'COMP_CODE',
            'SALES_ORG' => 'COMP_CODE',
            'PURCH_ORG' => 'COMP_CODE',
            'PERSONNEL_AREA' => 'COMP_CODE',
            'STORAGE_LOC' => 'PLANT',
            'COST_CENTER' => 'CONTROLLING_AREA',
            'PROFIT_CENTER' => 'CONTROLLING_AREA',
        ];

        foreach ($nodes as $node) {
            if (!isset($requiredParentMap[$node->node_type_id])) continue;
            $requiredTarget = $requiredParentMap[$node->node_type_id];
            $hasRequiredLink = $node->outgoingLinks->contains(function ($link) use ($requiredTarget) {
                return $link->targetNode && $link->targetNode->node_type_id === $requiredTarget;
            });

            if (!$hasRequiredLink) {
                $targetLabel = OrgMetaType::find($requiredTarget)?->display_name_ar ?? $requiredTarget;
                $issues[] = [
                    'type' => 'WARNING',
                    'category' => 'missing_parent',
                    'message' => "Missing required link to {$requiredTarget}",
                    'message_ar' => "رابط مطلوب مفقود إلى {$targetLabel}",
                    'node_uuid' => $node->node_uuid,
                    'node_code' => $node->code,
                    'node_type' => $node->node_type_id,
                ];
            }
        }

        // 4. Cardinality violations
        foreach ($rules as $rule) {
            if ($rule->cardinality === '1:1') {
                // Check if any target has more than 1 incoming link for this rule
                $violations = StructureLink::where('topology_rule_id', $rule->id)
                    ->where(function ($q) {
                        $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
                    })
                    ->select('target_node_uuid')
                    ->selectRaw('COUNT(*) as cnt')
                    ->groupBy('target_node_uuid')
                    ->having('cnt', '>', 1)
                    ->get();

                foreach ($violations as $v) {
                    $node = $nodes->firstWhere('node_uuid', $v->target_node_uuid);
                    $issues[] = [
                        'type' => 'ERROR',
                        'category' => 'cardinality_violation',
                        'message' => "1:1 cardinality violation — {$v->cnt} sources linked (rule: {$rule->description})",
                        'message_ar' => "مخالفة تعدد 1:1 — {$v->cnt} مصادر مرتبطة ({$rule->description})",
                        'node_uuid' => $v->target_node_uuid,
                        'node_code' => $node?->code ?? '?',
                        'node_type' => $node?->node_type_id ?? '?',
                    ];
                }
            }
        }

        // 5. Expired links still active
        $expiredLinks = StructureLink::where('valid_to', '<', now()->toDateString())->with(['sourceNode', 'targetNode'])->get();
        foreach ($expiredLinks as $link) {
            $issues[] = [
                'type' => 'INFO',
                'category' => 'expired_link',
                'message' => "Expired link: {$link->sourceNode?->code} → {$link->targetNode?->code} (expired {$link->valid_to})",
                'message_ar' => "ارتباط منتهي: {$link->sourceNode?->code} → {$link->targetNode?->code} (انتهى {$link->valid_to})",
                'node_uuid' => $link->source_node_uuid,
                'node_code' => $link->sourceNode?->code ?? '?',
                'node_type' => $link->sourceNode?->node_type_id ?? '?',
            ];
        }

        // 6. Inactive nodes with active links
        foreach ($nodes as $node) {
            if ($node->status !== 'active') {
                $activeOutLinks = $node->outgoingLinks->filter(fn($l) => $l->isActive())->count();
                $activeInLinks = $node->incomingLinks->filter(fn($l) => $l->isActive())->count();
                if ($activeOutLinks > 0 || $activeInLinks > 0) {
                    $issues[] = [
                        'type' => 'WARNING',
                        'category' => 'inactive_with_links',
                        'message' => "Inactive/archived node still has {$activeOutLinks} outgoing + {$activeInLinks} incoming active links",
                        'message_ar' => "وحدة غير نشطة لا تزال تحتفظ بـ {$activeOutLinks} ارتباط صادر + {$activeInLinks} ارتباط وارد نشط",
                        'node_uuid' => $node->node_uuid,
                        'node_code' => $node->code,
                        'node_type' => $node->node_type_id,
                    ];
                }
            }
        }

        return $issues;
    }

    // ─── Bulk Operations ────────────────────────────────────────────────

    /**
     * Bulk update status for multiple nodes.
     */
    public function bulkUpdateStatus(array $nodeUuids, string $newStatus): array
    {
        $results = ['updated' => 0, 'failed' => 0, 'errors' => []];

        foreach ($nodeUuids as $uuid) {
            $node = StructureNode::find($uuid);
            if (!$node) {
                $results['failed']++;
                $results['errors'][] = "Node {$uuid} not found.";
                continue;
            }

            $oldValues = ['status' => $node->status];
            $node->update(['status' => $newStatus, 'updated_by' => auth()->id()]);
            $this->recordChange('node', $uuid, 'status_change', $oldValues, ['status' => $newStatus]);
            $results['updated']++;
        }

        return $results;
    }

    // ─── Links Listing ──────────────────────────────────────────────────

    /**
     * Get all links with full relationship data (solves N+1 problem).
     */
    public function getAllLinks(array $filters = []): \Illuminate\Database\Eloquent\Collection
    {
        $query = StructureLink::with(['sourceNode.metaType', 'targetNode.metaType', 'topologyRule']);

        if (!empty($filters['source_type'])) {
            $query->whereHas('sourceNode', fn($q) => $q->where('node_type_id', $filters['source_type']));
        }
        if (!empty($filters['target_type'])) {
            $query->whereHas('targetNode', fn($q) => $q->where('node_type_id', $filters['target_type']));
        }
        if (!empty($filters['link_type'])) {
            $query->where('link_type', $filters['link_type']);
        }
        if (isset($filters['active_only']) && $filters['active_only']) {
            $query->where(function ($q) {
                $q->whereNull('valid_to')->orWhere('valid_to', '>=', now()->toDateString());
            });
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    /**
     * Update an existing link.
     */
    public function updateLink(int $linkId, array $data): StructureLink
    {
        $link = StructureLink::findOrFail($linkId);
        $oldValues = $link->toArray();

        $link->update(array_filter([
            'link_type' => $data['link_type'] ?? null,
            'priority' => $data['priority'] ?? null,
            'valid_from' => $data['valid_from'] ?? null,
            'valid_to' => $data['valid_to'] ?? null,
        ], fn($v) => $v !== null));

        $this->recordChange('link', (string) $linkId, 'updated', $oldValues, $link->fresh()->toArray());

        return $link->fresh(['sourceNode', 'targetNode']);
    }
}
