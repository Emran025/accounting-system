<?php

namespace App\Http\Requests\Commercial\Marketplace;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketplaceMerchantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('marketplace_merchants', 'slug')],
            'display_name_ar' => ['required', 'string', 'max:255'],
            'display_name_en' => ['nullable', 'string', 'max:255'],
            'short_description_ar' => ['nullable', 'string', 'max:2000'],
            'short_description_en' => ['nullable', 'string', 'max:2000'],
            'logo_media_url' => ['nullable', 'url', 'max:2048'],
            'public_url' => ['nullable', 'url', 'max:2048'],
        ];
    }
}
