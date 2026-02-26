<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Auth
require __DIR__ . '/api/auth.php';

// Protected Routes
Route::middleware(['api.auth', 'throttle:60,1'])->group(function () {
    require __DIR__ . '/api/system.php';
    require __DIR__ . '/api/finance.php';
    require __DIR__ . '/api/hr.php';
    require __DIR__ . '/api/inventory.php';
    require __DIR__ . '/api/sales.php';
    require __DIR__ . '/api/purchases.php';
    require __DIR__ . '/api/reports.php';
});
