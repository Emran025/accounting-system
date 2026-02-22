<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrgMetaType;
use App\Models\StructureLink;
use App\Models\StructureNode;
use App\Models\TopologyRule;
use App\Services\OrgStructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Api\BaseApiController;

/**
 * Organizational Structure Configuration Engine API.
 * SAP SPRO-style: Definition (nodes) and Assignment (links).
 * Covers all module dimensions with full audit, integrity, and bulk operations.
 */
class OrgStructureController extends Controller
{
    use BaseApiController;

    protected $orgService;

    public function __construct(OrgStructureService $orgService)
    {
        $this->orgService = $orgService;
    }

    // ─── Meta Types ─────────────────────────────────────────────────────

    /** List meta types (Company Code, Plant, etc.) */
    public function metaTypes(Request $request): JsonResponse
    {
        $query = OrgMetaType::with('attributes')->orderBy('sort_order');

        if ($request->filled('level_domain')) {
            $query->where('level_domain', $request->level_domain);
        }

        $types = $query->get();
        return $this->successResponse(['meta_types' => $types]);
    }

    // ─── Topology Rules ─────────────────────────────────────────────────

    /** List topology rules */
    public function topologyRules(Request $request): JsonResponse
    {
        $query = TopologyRule::with(['sourceType', 'targetType'])
            ->where('is_active', true)
            ->orderBy('sort_order');

        $rules = $query->get();
        return $this->successResponse(['topology_rules' => $rules]);
    }

    // ─── Nodes ──────────────────────────────────────────────────────────

    /** List structure nodes with optional filters */
    public function nodes(Request $request): JsonResponse
    {
        try {
            $query = StructureNode::with(['metaType', 'outgoingLinks', 'incomingLinks']);

        if ($request->filled('node_type_id')) {
            $query->where('node_type_id', $request->node_type_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('level_domain')) {
            $query->whereHas('metaType', fn($q) => $q->where('level_domain', $request->level_domain));
        }
        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('code', 'like', "%{$term}%")
                    ->orWhere('attributes_json->name', 'like', "%{$term}%");
            });
        }

        $nodes = $query->orderBy('node_type_id')->orderBy('code')->get();
        return $this->successResponse(['nodes' => $nodes]);
    } catch (\Exception $e) {
        return $this->errorResponse("Internal Error: " . $e->getMessage(), 500);
    }
    }

    /** Get single node with links */
    public function showNode(string $uuid): JsonResponse
    {
        $node = StructureNode::with(['metaType', 'outgoingLinks.targetNode.metaType', 'incomingLinks.sourceNode.metaType'])
            ->findOrFail($uuid);

        return $this->successResponse(['node' => $node]);
    }

    /** Create node (standalone or with link) */
    public function storeNode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_type_id' => 'required|string|exists:org_meta_types,id',
            'code' => 'required|string|max:32',
            'attributes' => 'nullable|array',
            'status' => 'nullable|in:active,inactive,archived',
            'valid_from' => 'nullable|date',
            'valid_to' => 'nullable|date|after_or_equal:valid_from',
            'link' => 'nullable|array',
            'link.target_node_uuid' => 'nullable|uuid|exists:structure_nodes,node_uuid',
            'link.link_type' => 'nullable|string|max:32',
            'link.validate_constraints' => 'nullable|boolean',
        ]);

        $nodeData = [
            'node_type_id' => $validated['node_type_id'],
            'code' => $validated['code'],
            'attributes' => $validated['attributes'] ?? [],
            'status' => $validated['status'] ?? 'active',
            'valid_from' => $validated['valid_from'] ?? null,
            'valid_to' => $validated['valid_to'] ?? null,
        ];

        if (StructureNode::where('node_type_id', $nodeData['node_type_id'])->where('code', $nodeData['code'])->exists()) {
            return $this->errorResponse('A node with this type and code already exists.', 422);
        }

        try {
            $result = $this->orgService->createNodeWithLink($nodeData, $validated['link'] ?? null);
            $response = ['node' => $result['node']];
            if ($result['link']) {
                $response['link'] = $result['link'];
            }
            return response()->json(['success' => true, 'message' => 'Node created successfully', 'node' => $response['node'], 'link' => $response['link'] ?? null], 201);
        } catch (ValidationException $e) {
            return $this->errorResponse(implode(' ', $e->validator->errors()->all()), 422);
        }
    }

    /** Update node */
    public function updateNode(Request $request, string $uuid): JsonResponse
    {
        $node = StructureNode::findOrFail($uuid);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:32',
            'attributes' => 'nullable|array',
            'status' => 'nullable|in:active,inactive,archived',
            'valid_from' => 'nullable|date',
            'valid_to' => 'nullable|date|after_or_equal:valid_from',
        ]);

        if (isset($validated['code']) && $validated['code'] !== $node->code) {
            if (StructureNode::where('node_type_id', $node->node_type_id)->where('code', $validated['code'])->exists()) {
                return $this->errorResponse('A node with this type and code already exists.', 422);
            }
        }

        $oldValues = $node->toArray();
        $node->update(array_merge($validated, ['updated_by' => auth()->id()]));

        $this->orgService->recordChange('node', $uuid, 'updated', $oldValues, $node->fresh()->toArray());

        return $this->successResponse(['node' => $node->fresh('metaType')], 'Node updated successfully');
    }

    /** Delete node (validates no dependent children) */
    public function destroyNode(string $uuid): JsonResponse
    {
        $node = StructureNode::findOrFail($uuid);
        $check = $this->orgService->canDeleteNode($uuid);

        if (!$check['allowed']) {
            return $this->errorResponse($check['reason'], 422);
        }

        $oldValues = $node->toArray();
        $node->delete();

        $this->orgService->recordChange('node', $uuid, 'deleted', $oldValues, null);

        return $this->successResponse([], 'Node deleted successfully');
    }

    // ─── Links ──────────────────────────────────────────────────────────

    /** List all links (efficient, no N+1) */
    public function links(Request $request): JsonResponse
    {
        $filters = [
            'source_type' => $request->source_type,
            'target_type' => $request->target_type,
            'link_type' => $request->link_type,
            'active_only' => $request->boolean('active_only', false),
        ];

        $links = $this->orgService->getAllLinks($filters);
        return $this->successResponse(['links' => $links]);
    }

    /** Create link between existing nodes */
    public function storeLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_node_uuid' => 'required|uuid|exists:structure_nodes,node_uuid',
            'target_node_uuid' => 'required|uuid|exists:structure_nodes,node_uuid',
            'link_type' => 'nullable|string|max:32',
            'priority' => 'nullable|integer|min:0',
            'valid_from' => 'nullable|date',
            'valid_to' => 'nullable|date|after_or_equal:valid_from',
        ]);

        try {
            $link = $this->orgService->createLink(
                $validated['source_node_uuid'],
                $validated['target_node_uuid'],
                $validated
            );
            return response()->json(['success' => true, 'message' => 'Link created successfully', 'link' => $link->load(['sourceNode', 'targetNode'])], 201);
        } catch (ValidationException $e) {
            return $this->errorResponse(implode(' ', $e->validator->errors()->all()), 422);
        }
    }

    /** Update link */
    public function updateLink(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'link_type' => 'nullable|string|max:32',
            'priority' => 'nullable|integer|min:0',
            'valid_from' => 'nullable|date',
            'valid_to' => 'nullable|date',
        ]);

        try {
            $link = $this->orgService->updateLink($id, $validated);
            return $this->successResponse(['link' => $link], 'Link updated successfully');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /** Delete link */
    public function destroyLink(int $id): JsonResponse
    {
        $link = StructureLink::findOrFail($id);
        $oldValues = $link->toArray();
        $link->delete();

        $this->orgService->recordChange('link', (string) $id, 'deleted', $oldValues, null);

        return $this->successResponse([], 'Link deleted successfully');
    }

    // ─── Scope Context ──────────────────────────────────────────────────

    /** Resolve scope context for a node */
    public function scopeContext(string $uuid): JsonResponse
    {
        $context = $this->orgService->resolveScopeContext($uuid);
        return $this->successResponse($context);
    }

    // ─── Statistics ─────────────────────────────────────────────────────

    /** Get comprehensive org structure statistics */
    public function statistics(): JsonResponse
    {
        try {
            $stats = $this->orgService->getStatistics();
            return $this->successResponse(['statistics' => $stats]);
        } catch (\Exception $e) {
            return $this->errorResponse("Statistics Error: " . $e->getMessage(), 500);
        }
    }

    // ─── Integrity Check ────────────────────────────────────────────────

    /** Run SAP-style consistency/integrity check */
    public function integrityCheck(): JsonResponse
    {
        $issues = $this->orgService->runIntegrityCheck();
        return $this->successResponse([
            'issues' => $issues,
            'total' => count($issues),
            'errors' => count(array_filter($issues, fn($i) => $i['type'] === 'ERROR')),
            'warnings' => count(array_filter($issues, fn($i) => $i['type'] === 'WARNING')),
            'info' => count(array_filter($issues, fn($i) => $i['type'] === 'INFO')),
        ]);
    }

    // ─── Change History ─────────────────────────────────────────────────

    /** Get change history for a specific entity */
    public function changeHistory(Request $request): JsonResponse
    {
        if ($request->filled('entity_type') && $request->filled('entity_id')) {
            $history = $this->orgService->getChangeHistory($request->entity_type, $request->entity_id);
        } else {
            $history = $this->orgService->getRecentChanges($request->integer('limit', 50));
        }

        return $this->successResponse(['history' => $history]);
    }

    // ─── Bulk Operations ────────────────────────────────────────────────

    /** Bulk update status for multiple nodes */
    public function bulkStatusUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_uuids' => 'required|array|min:1',
            'node_uuids.*' => 'uuid|exists:structure_nodes,node_uuid',
            'status' => 'required|in:active,inactive,archived',
        ]);

        $result = $this->orgService->bulkUpdateStatus($validated['node_uuids'], $validated['status']);
        return $this->successResponse($result, "Updated {$result['updated']} nodes.");
    }
}
