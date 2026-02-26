<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class JournalVoucherResource extends JsonResource
{
    /**
     * Note: This resource expects an object with 'voucher_number', 'entries', and header info.
     * Since JournalVouchers are stored multi-row, we usually group them in the controller.
     */
    public function toArray($request)
    {
        return [
            'voucher_number' => $this['voucher_number'],
            'voucher_date' => $this['voucher_date'],
            'description' => $this['description'],
            'created_by_name' => $this['created_by_name'] ?? 'N/A',
            'created_at' => $this['created_at'],
            'entries' => $this['entries']->map(function($entry) {
                return [
                    'id' => $entry->id,
                    'account_code' => $entry->account?->account_code,
                    'account_name' => $entry->account?->account_name,
                    'account_type' => $entry->account?->account_type,
                    'entry_type' => $entry->entry_type,
                    'amount' => (float)$entry->amount,
                    'description' => $entry->description,
                ];
            }),
            'total_amount' => (float)$this['entries']->where('entry_type', 'DEBIT')->sum('amount'),
        ];
    }
}
