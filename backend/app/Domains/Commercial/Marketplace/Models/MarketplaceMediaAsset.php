<?php

namespace App\Domains\Commercial\Marketplace\Models;

use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Facades\Storage;

class MarketplaceMediaAsset extends Model
{
    use HasUuids;

    protected $fillable = [
        'merchant_id', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes',
        'width', 'height', 'alt_text_ar', 'alt_text_en', 'status', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }

    protected $appends = ['public_url'];

    public function getPublicUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MarketplaceMerchant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function publications(): MorphToMany
    {
        return $this->morphedByMany(MarketplaceCatalogPublication::class, 'assignable', 'marketplace_media_assignments')
            ->withPivot(['id', 'role', 'sort_order'])->withTimestamps()->orderByPivot('sort_order');
    }

    public function offers(): MorphToMany
    {
        return $this->morphedByMany(MarketplaceOfferCampaign::class, 'assignable', 'marketplace_media_assignments')
            ->withPivot(['id', 'role', 'sort_order'])->withTimestamps()->orderByPivot('sort_order');
    }
}
