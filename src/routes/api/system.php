<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UsersController;
use App\Http\Controllers\Api\RolesController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\SessionsController;
use App\Http\Controllers\Api\GovernmentFeesController;
use App\Http\Controllers\Api\AuditTrailController;

// Settings
Route::middleware('can:settings,view')->get('/settings', [SettingsController::class, 'index'])->name('api.settings.index');
Route::middleware('can:settings,edit')->post('/settings', [SettingsController::class, 'update'])->name('api.settings.update');
Route::middleware('can:settings,view')->get('/settings/store', [SettingsController::class, 'getStoreSettings'])->name('api.settings.store');
Route::middleware('can:settings,edit')->put('/settings/store', [SettingsController::class, 'updateStoreSettings'])->name('api.settings.store.update');
Route::middleware('can:settings,view')->get('/settings/invoice', [SettingsController::class, 'getInvoiceSettings'])->name('api.settings.invoice');
Route::middleware('can:settings,edit')->put('/settings/invoice', [SettingsController::class, 'updateInvoiceSettings'])->name('api.settings.invoice.update');

// Government Fees (Kharaaj)
Route::middleware('can:settings,view')->get('/government_fees', [GovernmentFeesController::class, 'index'])->name('government_fees.index');
Route::middleware('can:settings,edit')->post('/government_fees', [GovernmentFeesController::class, 'store'])->name('government_fees.store');
Route::middleware('can:settings,view')->get('/government_fees/{id}', [GovernmentFeesController::class, 'show'])->name('government_fees.show');
Route::middleware('can:settings,edit')->put('/government_fees/{id}', [GovernmentFeesController::class, 'update'])->name('government_fees.update');
Route::middleware('can:settings,delete')->delete('/government_fees/{id}', [GovernmentFeesController::class, 'destroy'])->name('government_fees.destroy');

// Audit Logs
Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('api.audit_logs.index');
Route::middleware('can:audit_trail,view')->get('/audit-trail', [AuditTrailController::class, 'index'])->name('api.audit_trail.index');

// Users
Route::middleware('can:users,view')->get('/users', [UsersController::class, 'index'])->name('api.users.index');
Route::middleware('can:users,create')->post('/users', [UsersController::class, 'store'])->name('api.users.store');
Route::middleware('can:users,edit')->put('/users', [UsersController::class, 'update'])->name('api.users.update');
Route::middleware('can:users,delete')->delete('/users', [UsersController::class, 'destroy'])->name('api.users.destroy');
Route::post('/change_password', [UsersController::class, 'changePassword'])->name('api.change_password');
Route::get('/manager_list', [UsersController::class, 'managerList'])->name('api.manager_list');
Route::middleware('can:settings,view')->get('/users/managers', [UsersController::class, 'managerList'])->name('api.users.managers');
Route::middleware('can:settings,view')->get('/roles', [RolesController::class, 'index'])->name('api.roles.index');
Route::middleware('can:settings,create')->post('/roles', [RolesController::class, 'store'])->name('api.roles.store');
Route::middleware('can:settings,delete')->delete('/roles/{id}', [RolesController::class, 'destroy'])->name('api.roles.destroy');
Route::get('/my_sessions', [UsersController::class, 'mySessions'])->name('api.my_sessions');
Route::get('/sessions', [SessionsController::class, 'index'])->name('api.sessions.index');
Route::delete('/sessions/{id}', [SessionsController::class, 'destroy'])->name('api.sessions.destroy');
