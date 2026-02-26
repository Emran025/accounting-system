<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'barcode' => $this->barcode,
            'description' => $this->description,
            'category_id' => $this->category_id,
            'category_name' => $this->category?->name,
            'unit_price' => (float)$this->unit_price,
            'purchase_price' => (float)$this->purchase_price,
            'latest_purchase_price' => (float)($this->latest_purchase_price ?? 0),
            'stock_quantity' => (float)$this->stock_quantity,
            'minimum_stock' => (float)$this->minimum_stock,
            'unit_name' => $this->unit_name,
            'sub_unit_name' => $this->sub_unit_name,
            'items_per_unit' => (int)$this->items_per_unit,
            'minimum_profit_margin' => (float)$this->minimum_profit_margin,
            'is_active' => (bool)$this->is_active,
            'created_at' => $this->created_at->toDateTimeString(),
            'weighted_average_cost' => (float)$this->weighted_average_cost,
        ];
    }
}
