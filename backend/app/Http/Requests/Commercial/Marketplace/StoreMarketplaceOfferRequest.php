<?php

namespace App\Http\Requests\Commercial\Marketplace;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketplaceOfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'uuid', 'exists:marketplace_merchants,id'],
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('marketplace_offer_campaigns', 'slug')],
            'title_ar' => ['required', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'summary_ar' => ['nullable', 'string', 'max:2000'],
            'summary_en' => ['nullable', 'string', 'max:2000'],
            'disclosure_ar' => ['nullable', 'string', 'max:4000'],
            'disclosure_en' => ['nullable', 'string', 'max:4000'],
            'benefit_type' => ['required', Rule::in(['percentage', 'fixed_amount', 'fixed_price', 'bundle', 'gift'])],
            'benefit_value' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'currency_code' => ['nullable', 'string', 'size:3', 'alpha', 'required_if:benefit_type,fixed_amount,fixed_price'],
            'hero_media_url' => ['nullable', 'url', 'max:2048'],
            'targets' => ['required', 'array', 'min:1', 'max:100'],
            'targets.*.type' => ['required', Rule::in(['publication', 'product', 'category', 'collection'])],
            'targets.*.id' => ['required', 'string', 'max:100'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'timezone' => ['sometimes', 'string', 'timezone', 'max:64'],
        ];
    }

    public function after(): array
    {
        return [function ($validator): void {
            if ($this->input('benefit_type') === 'percentage' && (float) $this->input('benefit_value', 0) > 100) {
                $validator->errors()->add('benefit_value', 'Percentage benefit cannot exceed 100.');
            }
        }];
    }
}
