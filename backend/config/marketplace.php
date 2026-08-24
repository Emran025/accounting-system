<?php

return [
    'enabled' => (bool) env('MARKETPLACE_ENABLED', false),
    'tenant_id' => env('MARKETPLACE_TENANT_ID'),
    'operational_base_url' => rtrim((string) env('MARKETPLACE_OPERATIONAL_BASE_URL', ''), '/'),
    'signing_key' => env('MARKETPLACE_SIGNING_KEY'),
    'signing_key_id' => env('MARKETPLACE_SIGNING_KEY_ID', 'default'),
    'timeout_seconds' => (int) env('MARKETPLACE_HTTP_TIMEOUT', 10),
    'retry_backoff_seconds' => (int) env('MARKETPLACE_RETRY_BACKOFF_SECONDS', 60),
];
