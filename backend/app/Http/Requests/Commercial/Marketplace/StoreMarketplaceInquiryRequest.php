<?php

namespace App\Http\Requests\Commercial\Marketplace;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketplaceInquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['nullable', 'uuid', 'exists:marketplace_merchants,id'],
            'channel' => ['nullable', 'string', 'max:40'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:60'],
            'preferred_language' => ['nullable', Rule::in(['ar', 'en'])],
            'message' => ['nullable', 'string', 'max:5000'],
            'requested_at' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.publication_id' => ['nullable', 'uuid', 'exists:marketplace_catalog_publications,id'],
            'items.*.offer_id' => ['nullable', 'uuid', 'exists:marketplace_offer_campaigns,id'],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.item_kind' => ['nullable', Rule::in(['product', 'service'])],
            'items.*.public_title' => ['nullable', 'string', 'max:255'],
            'items.*.requested_quantity' => ['nullable', 'numeric', 'gt:0', 'max:999999'],
            'items.*.public_unit_price' => ['nullable', 'numeric', 'min:0', 'decimal:0,2'],
            'items.*.currency_code' => ['nullable', 'alpha', 'size:3'],
        ];
    }
}
