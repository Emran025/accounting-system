<?php

namespace App\Http\Requests\Commercial\Marketplace;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketplacePublicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'uuid', 'exists:marketplace_merchants,id'],
            'product_id' => ['required', 'integer', 'exists:products,id', Rule::unique('marketplace_catalog_publications')->where(fn ($query) => $query->where('merchant_id', $this->input('merchant_id')))],
            'public_slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('marketplace_catalog_publications', 'public_slug')],
            'visibility' => ['sometimes', Rule::in(['listed', 'unlisted'])],
            'public_name_ar' => ['nullable', 'string', 'max:255', 'required_without:public_name_en'],
            'public_name_en' => ['nullable', 'string', 'max:255', 'required_without:public_name_ar'],
            'short_description_ar' => ['nullable', 'string', 'max:2000'],
            'short_description_en' => ['nullable', 'string', 'max:2000'],
            'description_ar' => ['nullable', 'string', 'max:12000'],
            'description_en' => ['nullable', 'string', 'max:12000'],
            'search_keywords' => ['nullable', 'array', 'max:30'],
            'search_keywords.*' => ['string', 'max:100'],
            'cover_media_url' => ['nullable', 'url', 'max:2048'],
            'gallery_media_urls' => ['nullable', 'array', 'max:12'],
            'gallery_media_urls.*' => ['url', 'max:2048'],
            'availability' => ['sometimes', Rule::in(['available', 'limited', 'unavailable', 'preorder'])],
            'public_price' => ['nullable', 'numeric', 'min:0', 'decimal:0,2'],
            'currency_code' => ['nullable', 'string', 'size:3', 'alpha'],
            'unit_label_ar' => ['nullable', 'string', 'max:120'],
            'unit_label_en' => ['nullable', 'string', 'max:120'],
        ];
    }
}
