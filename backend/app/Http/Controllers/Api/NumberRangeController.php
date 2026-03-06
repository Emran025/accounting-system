<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NrObject;
use App\Models\NrGroup;
use App\Models\NrInterval;
use App\Models\NrGroupIntervalAssignment;
use App\Models\NrExpansionLog;
use App\Services\NumberRangeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NumberRangeController extends Controller
{
    use BaseApiController;

    private NumberRangeService $service;

    public function __construct(NumberRangeService $service)
    {
        $this->service = $service;
    }

    // ══════════════════════════════════════════════════════════════
    //  NR Objects
    // ══════════════════════════════════════════════════════════════

    /**
     * List all NR Objects (summary view).
     */
    public function indexObjects(): JsonResponse
    {
        $objects = NrObject::withCount(['groups', 'intervals', 'assignments'])
            ->orderBy('name')
            ->get();

        return $this->successResponse(['data' => $objects]);
    }

    /**
     * Get full detail for a single NR Object (includes groups, intervals, assignments, stats).
     */
    public function showObject(int $id): JsonResponse
    {
        try {
            $data = $this->service->getObjectFull($id);
            return $this->successResponse($data);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 404);
        }
    }

    /**
     * Get full detail for a NR Object by its object_type key.
     */
    public function showObjectByType(string $objectType): JsonResponse
    {
        $data = $this->service->getObjectFullByType($objectType);
        if (!$data) {
            return $this->errorResponse('نوع الكائن غير موجود', 404);
        }
        return $this->successResponse($data);
    }

    /**
     * Create a new NR Object.
     */
    public function storeObject(Request $request): JsonResponse
    {
        $request->validate([
            'object_type'   => 'required|string|max:50|unique:nr_objects,object_type',
            'name'          => 'required|string|max:255',
            'name_en'       => 'nullable|string|max:255',
            'description'   => 'nullable|string|max:500',
            'number_length' => 'required|integer|min:1|max:20',
            'prefix'        => 'nullable|string|max:10',
        ]);

        $object = NrObject::create([
            ...$request->only(['object_type', 'name', 'name_en', 'description', 'number_length', 'prefix']),
            'created_by' => $request->user()?->id,
        ]);

        return $this->successResponse([
            'id'      => $object->id,
            'message' => 'تم إنشاء كائن الترقيم بنجاح',
        ]);
    }

    /**
     * Update an NR Object.
     */
    public function updateObject(Request $request, int $id): JsonResponse
    {
        $object = NrObject::findOrFail($id);

        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'name_en'       => 'nullable|string|max:255',
            'description'   => 'nullable|string|max:500',
            'number_length' => 'sometimes|integer|min:1|max:20',
            'prefix'        => 'nullable|string|max:10',
            'is_active'     => 'sometimes|boolean',
        ]);

        $object->update($request->only(['name', 'name_en', 'description', 'number_length', 'prefix', 'is_active']));

        return $this->successResponse(['message' => 'تم تحديث كائن الترقيم']);
    }

    /**
     * Delete an NR Object (cascades groups, intervals, assignments).
     */
    public function destroyObject(int $id): JsonResponse
    {
        $object = NrObject::findOrFail($id);
        $object->delete();

        return $this->successResponse(['message' => 'تم حذف كائن الترقيم']);
    }

    // ══════════════════════════════════════════════════════════════
    //  NR Groups
    // ══════════════════════════════════════════════════════════════

    /**
     * List groups for an object.
     */
    public function indexGroups(int $objectId): JsonResponse
    {
        $groups = NrGroup::where('nr_object_id', $objectId)
            ->with('intervals')
            ->orderBy('code')
            ->get();

        return $this->successResponse(['data' => $groups]);
    }

    /**
     * Create a group under an object.
     */
    public function storeGroup(Request $request, int $objectId): JsonResponse
    {
        NrObject::findOrFail($objectId);

        $request->validate([
            'code'        => "required|string|max:20|unique:nr_groups,code,NULL,id,nr_object_id,{$objectId}",
            'name'        => 'required|string|max:255',
            'name_en'     => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        $group = NrGroup::create([
            'nr_object_id' => $objectId,
            ...$request->only(['code', 'name', 'name_en', 'description']),
            'created_by' => $request->user()?->id,
        ]);

        return $this->successResponse([
            'id'      => $group->id,
            'message' => 'تم إنشاء المجموعة بنجاح',
        ]);
    }

    /**
     * Update a group.
     */
    public function updateGroup(Request $request, int $groupId): JsonResponse
    {
        $group = NrGroup::findOrFail($groupId);

        $request->validate([
            'code'        => "sometimes|string|max:20|unique:nr_groups,code,{$groupId},id,nr_object_id,{$group->nr_object_id}",
            'name'        => 'sometimes|string|max:255',
            'name_en'     => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'is_active'   => 'sometimes|boolean',
        ]);

        $group->update($request->only(['code', 'name', 'name_en', 'description', 'is_active']));

        return $this->successResponse(['message' => 'تم تحديث المجموعة']);
    }

    /**
     * Delete a group.
     */
    public function destroyGroup(int $groupId): JsonResponse
    {
        NrGroup::findOrFail($groupId)->delete();
        return $this->successResponse(['message' => 'تم حذف المجموعة']);
    }

    // ══════════════════════════════════════════════════════════════
    //  NR Intervals
    // ══════════════════════════════════════════════════════════════

    /**
     * List intervals for an object.
     */
    public function indexIntervals(int $objectId): JsonResponse
    {
        $intervals = NrInterval::where('nr_object_id', $objectId)
            ->with('groups')
            ->orderBy('from_number')
            ->get()
            ->map(function ($interval) {
                $arr = $interval->toArray();
                $arr['capacity']         = $interval->capacity;
                $arr['used']             = $interval->used;
                $arr['remaining']        = $interval->remaining;
                $arr['fullness_percent'] = $interval->fullness_percent;
                $arr['status']           = $this->service->getDomainStatus($interval->fullness_percent);
                return $arr;
            });

        return $this->successResponse(['data' => $intervals]);
    }

    /**
     * Create an interval under an object.
     */
    public function storeInterval(Request $request, int $objectId): JsonResponse
    {
        $object = NrObject::findOrFail($objectId);

        $request->validate([
            'code'        => "required|string|max:20|unique:nr_intervals,code,NULL,id,nr_object_id,{$objectId}",
            'description' => 'nullable|string|max:500',
            'from_number' => 'required|integer|min:1',
            'to_number'   => 'required|integer|min:1',
            'is_external' => 'sometimes|boolean',
        ]);

        // Range validation
        $error = $this->service->validateRange($object, $request->from_number, $request->to_number);
        if ($error) {
            return $this->errorResponse($error);
        }

        // Overlap check
        if ($this->service->hasOverlap($objectId, $request->from_number, $request->to_number)) {
            return $this->errorResponse('النطاق يتداخل مع نطاق موجود');
        }

        $interval = NrInterval::create([
            'nr_object_id' => $objectId,
            ...$request->only(['code', 'description', 'from_number', 'to_number', 'is_external']),
            'created_by' => $request->user()?->id,
        ]);

        return $this->successResponse([
            'id'      => $interval->id,
            'message' => 'تم إنشاء نطاق الأرقام بنجاح',
        ]);
    }

    /**
     * Update an interval (description, is_external, is_active only  — boundaries via expand).
     */
    public function updateInterval(Request $request, int $intervalId): JsonResponse
    {
        $interval = NrInterval::findOrFail($intervalId);

        $request->validate([
            'code'        => "sometimes|string|max:20|unique:nr_intervals,code,{$intervalId},id,nr_object_id,{$interval->nr_object_id}",
            'description' => 'nullable|string|max:500',
            'is_external' => 'sometimes|boolean',
            'is_active'   => 'sometimes|boolean',
        ]);

        $interval->update($request->only(['code', 'description', 'is_external', 'is_active']));

        return $this->successResponse(['message' => 'تم تحديث نطاق الأرقام']);
    }

    /**
     * Delete an interval (only if unused, current_number == 0).
     */
    public function destroyInterval(int $intervalId): JsonResponse
    {
        $interval = NrInterval::findOrFail($intervalId);

        if ($interval->current_number > 0) {
            return $this->errorResponse('لا يمكن حذف نطاق تم استخدامه — يمكنك تعطيله بدلاً من ذلك');
        }

        $interval->delete();
        return $this->successResponse(['message' => 'تم حذف نطاق الأرقام']);
    }

    // ══════════════════════════════════════════════════════════════
    //  Assignments (Group ↔ Interval)
    // ══════════════════════════════════════════════════════════════

    /**
     * List assignments for an object.
     */
    public function indexAssignments(int $objectId): JsonResponse
    {
        $assignments = NrGroupIntervalAssignment::where('nr_object_id', $objectId)
            ->with(['group', 'interval'])
            ->orderBy('nr_group_id')
            ->get();

        return $this->successResponse(['data' => $assignments]);
    }

    /**
     * Create an assignment.
     */
    public function storeAssignment(Request $request, int $objectId): JsonResponse
    {
        NrObject::findOrFail($objectId);

        $request->validate([
            'nr_group_id'    => 'required|exists:nr_groups,id',
            'nr_interval_id' => 'required|exists:nr_intervals,id',
        ]);

        // Ensure both belong to the same object
        $group = NrGroup::where('id', $request->nr_group_id)->where('nr_object_id', $objectId)->first();
        $interval = NrInterval::where('id', $request->nr_interval_id)->where('nr_object_id', $objectId)->first();

        if (!$group || !$interval) {
            return $this->errorResponse('المجموعة أو النطاق لا ينتميان لنفس كائن الترقيم');
        }

        // Check for duplicates
        $exists = NrGroupIntervalAssignment::where('nr_group_id', $request->nr_group_id)
            ->where('nr_interval_id', $request->nr_interval_id)
            ->exists();

        if ($exists) {
            return $this->errorResponse('هذا الربط موجود بالفعل');
        }

        $assignment = NrGroupIntervalAssignment::create([
            'nr_object_id'   => $objectId,
            'nr_group_id'    => $request->nr_group_id,
            'nr_interval_id' => $request->nr_interval_id,
            'created_by'     => $request->user()?->id,
        ]);

        return $this->successResponse([
            'id'      => $assignment->id,
            'message' => 'تم الربط بنجاح',
        ]);
    }

    /**
     * Delete an assignment.
     */
    public function destroyAssignment(int $assignmentId): JsonResponse
    {
        NrGroupIntervalAssignment::findOrFail($assignmentId)->delete();
        return $this->successResponse(['message' => 'تم حذف الربط']);
    }

    // ══════════════════════════════════════════════════════════════
    //  Domain Fullness & Expansion
    // ══════════════════════════════════════════════════════════════

    /**
     * Get fullness report for all intervals of an object.
     */
    public function fullnessReport(int $objectId): JsonResponse
    {
        $report = $this->service->getFullnessReport($objectId);
        return $this->successResponse(['data' => $report]);
    }

    /**
     * Expand an interval's upper boundary.
     */
    public function expandInterval(Request $request, int $intervalId): JsonResponse
    {
        $request->validate([
            'new_to' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $interval = $this->service->expandInterval(
                $intervalId,
                $request->new_to,
                $request->reason,
                $request->user()?->id
            );

            return $this->successResponse([
                'message' => 'تم توسيع النطاق بنجاح',
                'interval' => [
                    ...$interval->toArray(),
                    'capacity'         => $interval->capacity,
                    'remaining'        => $interval->remaining,
                    'fullness_percent' => $interval->fullness_percent,
                ],
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Get expansion logs for an interval.
     */
    public function expansionLogs(int $intervalId): JsonResponse
    {
        $logs = NrExpansionLog::where('nr_interval_id', $intervalId)
            ->with('expandedBy')
            ->orderByDesc('created_at')
            ->get();

        return $this->successResponse(['data' => $logs]);
    }

    // ══════════════════════════════════════════════════════════════
    //  Next Number (for consumption by other modules)
    // ══════════════════════════════════════════════════════════════

    /**
     * Generate next number for a group.
     */
    public function getNextNumber(Request $request): JsonResponse
    {
        $request->validate([
            'object_id' => 'required|exists:nr_objects,id',
            'group_id'  => 'required|exists:nr_groups,id',
        ]);

        try {
            $number = $this->service->getNextNumber($request->object_id, $request->group_id);
            return $this->successResponse([
                'number'  => $number,
                'message' => 'تم توليد الرقم بنجاح',
            ]);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * System-wide summary of all NR objects.
     */
    public function systemSummary(): JsonResponse
    {
        $summary = $this->service->getSystemSummary();
        return $this->successResponse(['data' => $summary]);
    }
}
