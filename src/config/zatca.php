<?php

return [
    /*
    |--------------------------------------------------------------------------
    | ZATCA E-Invoicing Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for ZATCA (Saudi Tax Authority) e-invoicing integration.
    | This is required for businesses operating in Saudi Arabia.
    |
    */

    'enabled' => env('ZATCA_ENABLED', false),

    'environment' => env('ZATCA_ENVIRONMENT', 'sandbox'), // 'sandbox' or 'production'

    'api_url' => [
        'sandbox' => env('ZATCA_SANDBOX_URL', 'https://gw-apic-gov.gazt.gov.sa/e-invoicing/developer-portal'),
        'production' => env('ZATCA_PRODUCTION_URL', 'https://gw-apic-gov.gazt.gov.sa/e-invoicing'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Certificate Configuration
    |--------------------------------------------------------------------------
    |
    | Path to ZATCA certificate files. These should be stored securely
    | and not committed to version control.
    |
    */

    'certificate_path' => env('ZATCA_CERTIFICATE_PATH', 'zatca/certificate.pem'),
    'private_key_path' => env('ZATCA_PRIVATE_KEY_PATH', 'zatca/private_key.pem'),
    'certificate_password' => env('ZATCA_CERTIFICATE_PASSWORD', ''),

    /*
    |--------------------------------------------------------------------------
    | CSID Configuration
    |--------------------------------------------------------------------------
    |
    | Certificate Security Identifier (CSID) for ZATCA API authentication.
    |
    */

    'csid' => env('ZATCA_CSID', ''),

    /*
    |--------------------------------------------------------------------------
    | Submission Settings
    |--------------------------------------------------------------------------
    |
    | Default submission type and retry configuration.
    |
    */

    'default_submission_type' => env('ZATCA_SUBMISSION_TYPE', 'reporting'), // 'clearance' or 'reporting'

    'retry_attempts' => env('ZATCA_RETRY_ATTEMPTS', 3),
    'retry_delay' => env('ZATCA_RETRY_DELAY', 5), // seconds

];

