<?php

namespace App\Http\Resources;

use App\Models\GeneralLedger;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * AR Transaction Resource — financial amounts derived from GL (single source of truth).
 */
class ArTransactionResource extends JsonResource
{
    public function toArray($request)
    {
        // Derive amount from GL via voucher_number
        $amount = 0;
        if ($this->voucher_number) {
            $amount = (float) GeneralLedger::where('voucher_number', $this->voucher_number)
                ->where('entry_type', 'DEBIT')
                ->sum('amount');
        }

        return [
            'id' => $this->id,
            'customer_id' => $this->customer_id,
            'type' => $this->type,
            'amount' => $amount, // Derived from GL
            'voucher_number' => $this->voucher_number,
            'description' => $this->description,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'transaction_date' => $this->transaction_date?->toDateTimeString(),
            'created_by' => $this->createdBy?->username,
            'is_deleted' => (bool)$this->is_deleted,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
