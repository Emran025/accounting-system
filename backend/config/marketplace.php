<?php

return [
    'enabled' => (bool) env('MARKETPLACE_ENABLED', false),
    'tenant_id' => env('MARKETPLACE_TENANT_ID'),
    'operational_base_url' => rtrim((string) env('MARKETPLACE_OPERATIONAL_BASE_URL', ''), '/'),
    'signing_key' => env('MARKETPLACE_SIGNING_KEY'),
    'signing_key_id' => env('MARKETPLACE_SIGNING_KEY_ID', 'default'),
    'inbound_signing_key' => env('MARKETPLACE_INBOUND_SIGNING_KEY'),
    'inbound_key_id' => env('MARKETPLACE_INBOUND_KEY_ID', 'default'),
    'inbound_max_age_seconds' => (int) env('MARKETPLACE_INBOUND_MAX_AGE_SECONDS', 300),
    'timeout_seconds' => (int) env('MARKETPLACE_HTTP_TIMEOUT', 10),
    'retry_backoff_seconds' => (int) env('MARKETPLACE_RETRY_BACKOFF_SECONDS', 60),
];
