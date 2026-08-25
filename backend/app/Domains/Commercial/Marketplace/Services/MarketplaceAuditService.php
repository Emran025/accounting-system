<?php

namespace App\Domains\Commercial\Marketplace\Services;

use App\Domains\Commercial\Marketplace\Models\MarketplaceAuditLog;
use Illuminate\Database\Eloquent\Model;

class MarketplaceAuditService
{
    /** @param array<string, mixed>|null $before @param array<string, mixed>|null $after @param array<string, mixed> $metadata */
    public function record(
        string $eventType,
        Model $subject,
        ?int $actorId = null,
        ?array $before = null,
        ?array $after = null,
        array $metadata = [],
    ): MarketplaceAuditLog {
        return MarketplaceAuditLog::create([
            'event_type' => $eventType,
            'subject_type' => $subject::class,
            'subject_id' => (string) $subject->getKey(),
            'actor_id' => $actorId,
            'before_state' => $before,
            'after_state' => $after,
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }
}
