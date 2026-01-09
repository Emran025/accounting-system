<?php

namespace App\Services;

use App\Models\Telescope;
use Illuminate\Support\Facades\Log;

class TelescopeService
{
    public static function logOperation(
        string $operation,
        string $tableName,
        ?int $recordId = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        try {
            Telescope::create([
                'user_id' => auth()->id() ?? session('user_id'),
                'operation' => $operation,
                'table_name' => $tableName,
                'record_id' => $recordId,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => request()->ip(),
                'user_agent' => substr(request()->userAgent() ?? '', 0, 255),
            ]);
        } catch (\Exception $e) {
            Log::error("Telescope logging failed: " . $e->getMessage());
        }
    }
}

