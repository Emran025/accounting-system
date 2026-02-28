<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tax Engine Feature Flag
    |--------------------------------------------------------------------------
    |
    | When true, the new multi-jurisdiction tax engine is used. Tax calculations
    | go through TaxCalculator, and tax_lines are persisted for audit.
    | When false, legacy config('accounting.vat_rate') is used.
    |
    */
    'use_tax_engine' => env('TAX_ENGINE_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Default Country Code
    |--------------------------------------------------------------------------
    */
    'default_country' => env('TAX_DEFAULT_COUNTRY', 'SA'),
];
