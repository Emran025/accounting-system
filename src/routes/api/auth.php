<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Auth routes with stricter rate limiting
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1') // 5 attempts per minute
    ->name('api.login');
Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');
Route::get('/check', [AuthController::class, 'check'])->name('api.check');
