<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'invoice_number' => 'nullable|string|max:50',
            'payment_type' => 'required|in:cash,credit',
            'customer_id' => 'required_if:payment_type,credit|nullable|exists:ar_customers,id',
            'amount_paid' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.unit_type' => 'nullable|string|in:main,sub,piece,package',
            'vat_rate' => 'nullable|numeric|min:0|max:100',
        ];
    }
}
