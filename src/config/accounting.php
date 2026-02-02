<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default VAT Rate
    |--------------------------------------------------------------------------
    |
    | This value is the default VAT rate for the system.
    |
    */
    'vat_rate' => 0.15,

    /*
    |--------------------------------------------------------------------------
    | Accounting Rules
    |--------------------------------------------------------------------------
    |
    */
    'prevent_posting_to_parent_accounts' => true,

    /*
    |--------------------------------------------------------------------------
    | Multi-Currency Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for the Policy-Driven Multi-Currency Framework.
    | These settings define how currencies are handled throughout the system.
    |
    */
    'currency' => [
        /*
        |--------------------------------------------------------------------------
        | Default Exchange Rate Precision
        |--------------------------------------------------------------------------
        |
        | The number of decimal places to use for exchange rate calculations.
        | Higher precision is important for cross-rate calculations.
        |
        */
        'exchange_rate_precision' => 8,

        /*
        |--------------------------------------------------------------------------
        | Amount Precision
        |--------------------------------------------------------------------------
        |
        | The number of decimal places to use for amounts after conversion.
        |
        */
        'amount_precision' => 4,

        /*
        |--------------------------------------------------------------------------
        | Exchange Rate Source
        |--------------------------------------------------------------------------
        |
        | Default source for exchange rates.
        | Options: 'MANUAL', 'CENTRAL_BANK', 'API'
        |
        */
        'default_exchange_rate_source' => 'MANUAL',

        /*
        |--------------------------------------------------------------------------
        | Revaluation Accounts
        |--------------------------------------------------------------------------
        |
        | Account codes for recording foreign exchange gains and losses.
        | These are used during revaluation and settlement.
        |
        */
        'accounts' => [
            'exchange_gain' => '4500', // Other Income - Foreign Exchange Gain
            'exchange_loss' => '5500', // Other Expense - Foreign Exchange Loss
            'unrealized_gain' => '4501', // Unrealized Exchange Gain
            'unrealized_loss' => '5501', // Unrealized Exchange Loss
        ],

        /*
        |--------------------------------------------------------------------------
        | Auto-record Exchange Rates
        |--------------------------------------------------------------------------
        |
        | Whether to automatically record exchange rates to history
        | when transactions are posted.
        |
        */
        'auto_record_rates' => true,

        /*
        |--------------------------------------------------------------------------
        | Require Exchange Rate for Foreign Transactions
        |--------------------------------------------------------------------------
        |
        | If true, foreign currency transactions will fail without
        | an available exchange rate.
        |
        */
        'require_exchange_rate' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Inventory Configuration
    |--------------------------------------------------------------------------
    */
    'inventory' => [
        'costing_method' => env('INVENTORY_COSTING_METHOD', 'FIFO'),
    ],
];
