<?php

namespace App\Domains\Commercial\SalesLifecycle\Models;

use App\Domains\Commercial\CRM\Models\ArCustomer;
use App\Domains\Commercial\Marketplace\Models\MarketplaceInquiry;
use App\Domains\SupplyChain\Inventory\Models\Warehouse;
use App\Domains\EnterpriseCore\IdentityAccess\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesQuotation extends Model
{
    use HasFactory;

    public const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

    protected $fillable = [
        'quote_number',
        'customer_id',
        'marketplace_inquiry_id',
        'customer_name',
        'customer_contact',
        'customer_email',
        'customer_phone',
        'warehouse_id',
        'status',
        'issue_date',
        'valid_until',
        'currency',
        'tax_rate',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'scope_summary',
        'payment_terms',
        'terms_conditions',
        'notes',
        'sent_at',
        'accepted_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'valid_until' => 'date',
            'sent_at' => 'datetime',
            'accepted_at' => 'datetime',
            'tax_rate' => 'decimal:4',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(ArCustomer::class, 'customer_id')->withoutGlobalScopes();
    }

    public function marketplaceInquiry(): BelongsTo
    {
        return $this->belongsTo(MarketplaceInquiry::class, 'marketplace_inquiry_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesQuotationItem::class)->orderBy('sort_order');
    }

    public function isEditable(): bool
    {
        return in_array($this->status, ['draft', 'sent'], true);
    }
}
