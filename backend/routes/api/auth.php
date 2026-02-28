<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Auth routes with strict rate limiting (by IP)
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:api-auth')
    ->name('api.login');

// These require an active session – protect with api.auth
Route::middleware('api.auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
    Route::get('/check', [AuthController::class, 'check'])->name('api.check');
});
