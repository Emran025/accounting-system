<?php

namespace App\Http\Requests\Commercial\Marketplace;

use Illuminate\Validation\Rule;

class UpdateMarketplaceOfferRequest extends StoreMarketplaceOfferRequest
{
    public function rules(): array
    {
        $offer = $this->route('offer');

        return [
            'merchant_id' => ['sometimes', 'required', 'uuid', 'exists:marketplace_merchants,id'],
            'slug' => ['sometimes', 'required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('marketplace_offer_campaigns', 'slug')->ignore($offer)],
            'title_ar' => ['sometimes', 'required', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'summary_ar' => ['nullable', 'string', 'max:2000'],
            'summary_en' => ['nullable', 'string', 'max:2000'],
            'disclosure_ar' => ['nullable', 'string', 'max:4000'],
            'disclosure_en' => ['nullable', 'string', 'max:4000'],
            'benefit_type' => ['sometimes', 'required', Rule::in(['percentage', 'fixed_amount', 'fixed_price', 'bundle', 'gift'])],
            'benefit_value' => ['sometimes', 'required', 'numeric', 'min:0', 'decimal:0,2'],
            'currency_code' => ['nullable', 'string', 'size:3', 'alpha'],
            'hero_media_url' => ['nullable', 'url', 'max:2048'],
            'targets' => ['sometimes', 'required', 'array', 'min:1', 'max:100'],
            'targets.*.type' => ['required_with:targets', Rule::in(['publication', 'product', 'category', 'collection'])],
            'targets.*.id' => ['required_with:targets', 'string', 'max:100'],
            'starts_at' => ['sometimes', 'required', 'date'],
            'ends_at' => ['sometimes', 'required', 'date', 'after:starts_at'],
            'timezone' => ['sometimes', 'string', 'timezone', 'max:64'],
        ];
    }
}
