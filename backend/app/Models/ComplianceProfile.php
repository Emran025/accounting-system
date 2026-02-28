<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Compliance Profile – defines how tax/compliance data is transmitted to an entity.
 *
 * Policy 1 (push): Our system pushes data to the entity's endpoint.
 * Policy 2 (pull): Entity pulls data from our generated API endpoint using a token.
 *
 * Part of EPIC #1: Tax Engine Transformation.
 */
class ComplianceProfile extends Model
{
    protected $fillable = [
        'tax_authority_id',
        'name',
        'code',
        'policy_type',
        'transmission_format',
        'key_mapping',
        'structure_template',
        // Push fields
        'endpoint_url',
        'auth_type',
        'auth_credentials',
        'request_headers',
        'http_method',
        'openapi_spec',
        // Pull fields
        'access_token',
        'token_expires_at',
        'allowed_ips',
        'pull_endpoint_path',
        // Common
        'is_active',
        'notes',
    ];

    /**
     * Hide sensitive fields from JSON serialization.
     * The frontend receives `token_preview` (appended) instead of the raw token.
     */
    protected $hidden = [
        'access_token',
        'auth_credentials',
    ];

    /**
     * Append computed attributes to JSON.
     */
    protected $appends = [
        'token_preview',
        'pull_endpoint',
    ];

    protected function casts(): array
    {
        return [
            'key_mapping'       => 'array',
            'request_headers'   => 'array',
            'openapi_spec'      => 'array',
            'allowed_ips'       => 'array',
            'auth_credentials'  => 'encrypted',
            'is_active'         => 'boolean',
            'token_expires_at'  => 'datetime',
        ];
    }

    // ══════════════════════════════════════════
    // Relationships
    // ══════════════════════════════════════════

    public function taxAuthority(): BelongsTo
    {
        return $this->belongsTo(TaxAuthority::class);
    }

    // ══════════════════════════════════════════
    // Scopes
    // ══════════════════════════════════════════

    /** Scope to only active profiles. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** Scope to push-type profiles. */
    public function scopePush(Builder $query): Builder
    {
        return $query->where('policy_type', 'push');
    }

    /** Scope to pull-type profiles. */
    public function scopePull(Builder $query): Builder
    {
        return $query->where('policy_type', 'pull');
    }

    /** Scope by tax authority. */
    public function scopeForAuthority(Builder $query, int $authorityId): Builder
    {
        return $query->where('tax_authority_id', $authorityId);
    }

    // ══════════════════════════════════════════
    // Policy helpers
    // ══════════════════════════════════════════

    public function isPush(): bool
    {
        return $this->policy_type === 'push';
    }

    public function isPull(): bool
    {
        return $this->policy_type === 'pull';
    }

    // ══════════════════════════════════════════
    // Appended Attributes
    // ══════════════════════════════════════════

    /**
     * Truncated token preview for display in the frontend.
     * Shows first 12 chars + "..." + last 6 chars.
     * Returns null if no token exists.
     */
    public function getTokenPreviewAttribute(): ?string
    {
        if (!$this->access_token) {
            return null;
        }
        $token = $this->access_token;
        if (strlen($token) <= 24) {
            return str_repeat('•', strlen($token));
        }
        return substr($token, 0, 12) . '••••••••' . substr($token, -6);
    }

    /**
     * Full pull endpoint URL for this profile.
     */
    public function getPullEndpointAttribute(): ?string
    {
        if (!$this->isPull()) {
            return null;
        }
        $path = $this->pull_endpoint_path ?: 'compliance-data';
        return url("/api/compliance-pull/{$this->code}/{$path}");
    }

    // ══════════════════════════════════════════
    // Token Management
    // ══════════════════════════════════════════

    /**
     * Generate a new secure access token for pull-based access.
     * Returns the raw token — this is the ONLY time it's visible in full.
     */
    public function generateAccessToken(int $expiresInDays = 365): string
    {
        $token = Str::random(64) . '.' . hash('sha256', $this->id . now()->timestamp . Str::random(16));

        $this->update([
            'access_token'    => $token,
            'token_expires_at' => now()->addDays($expiresInDays),
        ]);

        return $token;
    }

    /**
     * Verify if the current token is valid.
     */
    public function isTokenValid(): bool
    {
        if (!$this->access_token) {
            return false;
        }

        if ($this->token_expires_at && $this->token_expires_at->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * Check if the current token has expired.
     */
    public function isTokenExpired(): bool
    {
        return $this->token_expires_at && $this->token_expires_at->isPast();
    }

    /**
     * Revoke the current access token.
     */
    public function revokeToken(): void
    {
        $this->update([
            'access_token'    => null,
            'token_expires_at' => null,
        ]);
    }

    /**
     * Verify a request IP against the allowed IPs list.
     */
    public function isIpAllowed(string $ip): bool
    {
        if (empty($this->allowed_ips)) {
            return true; // No restriction
        }

        return in_array($ip, $this->allowed_ips);
    }

    // ══════════════════════════════════════════
    // Format helpers
    // ══════════════════════════════════════════

    /**
     * Get the list of system keys that this profile maps.
     */
    public function getSystemKeys(): array
    {
        return $this->key_mapping ? array_keys($this->key_mapping) : [];
    }

    /**
     * Get the list of entity (mapped) keys.
     */
    public function getEntityKeys(): array
    {
        return $this->key_mapping ? array_values($this->key_mapping) : [];
    }

    /**
     * Get the content-type header for the transmission format.
     */
    public function getContentType(): string
    {
        return match ($this->transmission_format) {
            'json'  => 'application/json',
            'xml'   => 'application/xml',
            'yml'   => 'application/x-yaml',
            'excel' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            default => 'application/json',
        };
    }

    /**
     * Transform source data using the key mapping.
     * Maps system keys → entity keys.
     */
    public function transformData(array $sourceData): array
    {
        if (empty($this->key_mapping)) {
            return $sourceData;
        }

        $transformed = [];
        foreach ($this->key_mapping as $systemKey => $entityKey) {
            $targetKey = $entityKey ?: $systemKey;
            if (array_key_exists($systemKey, $sourceData)) {
                $transformed[$targetKey] = $sourceData[$systemKey];
            }
        }

        return $transformed;
    }

    /**
     * Find a profile by its access token.
     */
    public static function findByToken(string $token): ?self
    {
        return static::where('access_token', $token)
            ->where('is_active', true)
            ->where('policy_type', 'pull')
            ->where(function ($q) {
                $q->whereNull('token_expires_at')
                  ->orWhere('token_expires_at', '>', now());
            })
            ->first();
    }
}
