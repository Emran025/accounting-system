<?php

namespace App\Services;

use App\Models\NrObject;
use App\Models\NrGroup;
use App\Models\NrInterval;
use App\Models\NrGroupIntervalAssignment;
use App\Models\NrExpansionLog;
use Illuminate\Support\Facades\DB;

/**
 * NumberRangeService — core business logic for the Number Range Object system.
 *
 * Handles next-number generation, range overlap validation, fullness analysis,
 * domain expansion with audit logging, and summary statistics.
 */
class NumberRangeService
{
    // ── Warning thresholds ────────────────────────────────────────

    const WARN_PERCENT  = 80;   // Yellow zone
    const CRIT_PERCENT  = 95;   // Red zone

    // ══════════════════════════════════════════════════════════════
    //  Object CRUD helpers
    // ══════════════════════════════════════════════════════════════

    /**
     * Get a full NR Object with all nested data and statistics.
     */
    public function getObjectFull(int $objectId): array
    {
        $object = NrObject::with([
            'groups.intervals',
            'intervals.expansionLogs',
            'assignments.group',
            'assignments.interval',
        ])->findOrFail($objectId);

        return $this->enrichObject($object);
    }

    /**
     * Get an NR Object by its object_type key.
     */
    public function getObjectByType(string $objectType): ?NrObject
    {
        return NrObject::where('object_type', $objectType)->first();
    }

    /**
     * Get full data for an NR Object identified by object_type.
     */
    public function getObjectFullByType(string $objectType): ?array
    {
        $object = NrObject::with([
            'groups.intervals',
            'intervals.expansionLogs',
            'assignments.group',
            'assignments.interval',
        ])->where('object_type', $objectType)->first();

        if (!$object) {
            return null;
        }

        return $this->enrichObject($object);
    }

    /**
     * Enrich an NR Object with computed statistics for API output.
     */
    private function enrichObject(NrObject $object): array
    {
        $data = $object->toArray();

        // Enrich intervals with domain fullness info
        $data['intervals'] = $object->intervals->map(function ($interval) {
            $arr = $interval->toArray();
            $arr['capacity']         = $interval->capacity;
            $arr['used']             = $interval->used;
            $arr['remaining']        = $interval->remaining;
            $arr['fullness_percent'] = $interval->fullness_percent;
            $arr['status']           = $this->getDomainStatus($interval->fullness_percent);
            return $arr;
        })->toArray();

        // Summary statistics
        $totalCapacity  = $object->intervals->sum(fn ($i) => $i->capacity);
        $totalUsed      = $object->intervals->sum(fn ($i) => $i->used);
        $totalRemaining = $totalCapacity - $totalUsed;

        $data['summary'] = [
            'total_groups'     => $object->groups->count(),
            'total_intervals'  => $object->intervals->count(),
            'total_assignments'=> $object->assignments->count(),
            'total_capacity'   => $totalCapacity,
            'total_used'       => $totalUsed,
            'total_remaining'  => $totalRemaining,
            'overall_fullness' => $totalCapacity > 0 ? round(($totalUsed / $totalCapacity) * 100, 2) : 0,
        ];

        return $data;
    }

    // ══════════════════════════════════════════════════════════════
    //  Next Number Generation
    // ══════════════════════════════════════════════════════════════

    /**
     * Generate the next number for a given group within an NR Object.
     *
     * Uses a pessimistic lock to prevent race conditions.
     *
     * @return string  The formatted number (with prefix and padding)
     * @throws \Exception if the range is exhausted
     */
    public function getNextNumber(int $objectId, int $groupId): string
    {
        return DB::transaction(function () use ($objectId, $groupId) {
            $object = NrObject::findOrFail($objectId);

            // Find assigned internal interval for this group
            $assignment = NrGroupIntervalAssignment::where('nr_object_id', $objectId)
                ->where('nr_group_id', $groupId)
                ->where('is_active', true)
                ->first();

            if (!$assignment) {
                throw new \Exception('لا يوجد نطاق أرقام مُعَيَّن لهذه المجموعة');
            }

            // Lock interval row for update
            $interval = NrInterval::where('id', $assignment->nr_interval_id)
                ->where('is_active', true)
                ->where('is_external', false)
                ->lockForUpdate()
                ->first();

            if (!$interval) {
                throw new \Exception('نطاق الأرقام المُعَيَّن غير نشط أو خارجي');
            }

            // Determine next number
            $next = $interval->current_number === 0
                ? $interval->from_number
                : $interval->current_number + 1;

            if ($next > $interval->to_number) {
                throw new \Exception("النطاق {$interval->code} ممتلئ — يرجى توسيع النطاق أو إنشاء نطاق جديد");
            }

            // Update counter
            $interval->current_number = $next;
            $interval->save();

            // Format
            $formatted = str_pad((string) $next, $object->number_length, '0', STR_PAD_LEFT);
            if ($object->prefix) {
                $formatted = $object->prefix . $formatted;
            }

            return $formatted;
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  Interval Validation
    // ══════════════════════════════════════════════════════════════

    /**
     * Check whether a proposed [from, to] range overlaps with existing intervals.
     */
    public function hasOverlap(int $objectId, int $from, int $to, ?int $excludeId = null): bool
    {
        $query = NrInterval::where('nr_object_id', $objectId)
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('from_number', [$from, $to])
                  ->orWhereBetween('to_number', [$from, $to])
                  ->orWhere(function ($q2) use ($from, $to) {
                      $q2->where('from_number', '<=', $from)
                         ->where('to_number', '>=', $to);
                  });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    /**
     * Validate an interval range against the object's number_length.
     */
    public function validateRange(NrObject $object, int $from, int $to): ?string
    {
        if ($from >= $to) {
            return 'بداية النطاق يجب أن تكون أقل من نهايته';
        }

        $maxNumber = (int) str_repeat('9', $object->number_length);

        if ($from < 1 || $to > $maxNumber) {
            return "النطاق يجب أن يكون بين 1 و {$maxNumber} (بناءً على طول الترقيم {$object->number_length} أرقام)";
        }

        return null;  // valid
    }

    // ══════════════════════════════════════════════════════════════
    //  Domain Fullness Analysis
    // ══════════════════════════════════════════════════════════════

    /**
     * Return a status label for a fullness percentage.
     */
    public function getDomainStatus(float $percent): string
    {
        if ($percent >= self::CRIT_PERCENT) return 'critical';
        if ($percent >= self::WARN_PERCENT)  return 'warning';
        return 'healthy';
    }

    /**
     * Get fullness analysis for all intervals under an object.
     */
    public function getFullnessReport(int $objectId): array
    {
        $intervals = NrInterval::where('nr_object_id', $objectId)
            ->where('is_active', true)
            ->get();

        return $intervals->map(function ($interval) {
            return [
                'id'               => $interval->id,
                'code'             => $interval->code,
                'from_number'      => $interval->from_number,
                'to_number'        => $interval->to_number,
                'current_number'   => $interval->current_number,
                'capacity'         => $interval->capacity,
                'used'             => $interval->used,
                'remaining'        => $interval->remaining,
                'fullness_percent' => $interval->fullness_percent,
                'status'           => $this->getDomainStatus($interval->fullness_percent),
            ];
        })->toArray();
    }

    // ══════════════════════════════════════════════════════════════
    //  Range Expansion
    // ══════════════════════════════════════════════════════════════

    /**
     * Expand an existing interval's upper boundary.
     *
     * Validates no overlap, creates an audit log, and returns updated interval.
     */
    public function expandInterval(int $intervalId, int $newTo, ?string $reason = null, ?int $userId = null): NrInterval
    {
        return DB::transaction(function () use ($intervalId, $newTo, $reason, $userId) {
            $interval = NrInterval::lockForUpdate()->findOrFail($intervalId);
            $object   = $interval->object;

            // Validate new_to > old_to
            if ($newTo <= $interval->to_number) {
                throw new \Exception('الحد الجديد يجب أن يكون أكبر من الحد الحالي');
            }

            // Validate against number length
            $maxNumber = (int) str_repeat('9', $object->number_length);
            if ($newTo > $maxNumber) {
                throw new \Exception("الحد الأقصى المسموح هو {$maxNumber} بناءً على طول {$object->number_length} أرقام");
            }

            // Check overlap with other intervals
            if ($this->hasOverlap($object->id, $interval->to_number + 1, $newTo, $interval->id)) {
                throw new \Exception('التوسيع يتعارض مع نطاق آخر');
            }

            // Log the expansion
            NrExpansionLog::create([
                'nr_interval_id' => $interval->id,
                'old_from'       => $interval->from_number,
                'old_to'         => $interval->to_number,
                'new_from'       => $interval->from_number,
                'new_to'         => $newTo,
                'reason'         => $reason,
                'expanded_by'    => $userId,
            ]);

            $interval->to_number = $newTo;
            $interval->save();

            return $interval->fresh();
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  Summary / Statistics
    // ══════════════════════════════════════════════════════════════

    /**
     * Get a system-wide summary of all NR Objects.
     */
    public function getSystemSummary(): array
    {
        $objects = NrObject::withCount(['groups', 'intervals', 'assignments'])->get();

        return $objects->map(function ($obj) {
            $intervals      = NrInterval::where('nr_object_id', $obj->id)->get();
            $totalCapacity  = $intervals->sum(fn ($i) => $i->capacity);
            $totalUsed      = $intervals->sum(fn ($i) => $i->used);

            return [
                'id'               => $obj->id,
                'object_type'      => $obj->object_type,
                'name'             => $obj->name,
                'name_en'          => $obj->name_en,
                'prefix'           => $obj->prefix,
                'number_length'    => $obj->number_length,
                'is_active'        => $obj->is_active,
                'groups_count'     => $obj->groups_count,
                'intervals_count'  => $obj->intervals_count,
                'assignments_count'=> $obj->assignments_count,
                'total_capacity'   => $totalCapacity,
                'total_used'       => $totalUsed,
                'overall_fullness' => $totalCapacity > 0 ? round(($totalUsed / $totalCapacity) * 100, 2) : 0,
            ];
        })->toArray();
    }
}
