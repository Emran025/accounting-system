<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceInquiry extends Model
{
    use HasUuids;

    public const STATUSES = ['new', 'assigned', 'qualified', 'quoted', 'converted', 'lost', 'cancelled'];

    protected $table = 'marketplace_inquiries';

    protected $fillable = [
        'remote_inquiry_id',
        'merchant_id',
        'source',
        'channel',
        'status',
        'customer_name',
        'customer_email',
        'customer_phone',
        'preferred_language',
        'message',
        'requested_at',
        'assigned_to',
        'assigned_at',
        'qualified_by',
        'qualified_at',
        'conversion_type',
        'conversion_id',
        'converted_by',
        'converted_at',
        'lost_reason',
        'source_payload',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'assigned_at' => 'datetime',
            'qualified_at' => 'datetime',
            'converted_at' => 'datetime',
            'source_payload' => 'array',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMerchant::class, 'merchant_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MarketplaceInquiryItem::class, 'inquiry_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function qualifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'qualified_by');
    }

    public function converter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'converted_by');
    }

    public function canTransitionTo(string $status): bool
    {
        return match ($this->status) {
            'new' => in_array($status, ['assigned', 'qualified', 'lost', 'cancelled'], true),
            'assigned' => in_array($status, ['qualified', 'lost', 'cancelled'], true),
            'qualified' => in_array($status, ['quoted', 'converted', 'lost', 'cancelled'], true),
            'quoted' => in_array($status, ['converted', 'lost', 'cancelled'], true),
            default => false,
        };
    }
}
