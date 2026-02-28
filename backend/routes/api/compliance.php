<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ComplianceProfileController;

/*
|--------------------------------------------------------------------------
| Compliance & Tax Transmission Routes
|--------------------------------------------------------------------------
*/

// ── External Pull Endpoint (No internal auth – uses bearer token) ──
// External entities call this to retrieve compliance data using their access token.
Route::middleware(['throttle:10,1'])
    ->get('/compliance-pull/{code}/{path?}', [ComplianceProfileController::class, 'servePullData'])
    ->name('api.compliance_pull.serve');

// ── Management Routes (Requires internal auth) ──
Route::middleware(['api.auth', 'throttle:60,1'])->group(function () {
    
    // Compliance Profiles
    Route::group(['middleware' => ['can:settings,view'], 'prefix' => 'compliance-profiles'], function () {
        Route::get('/', [ComplianceProfileController::class, 'index'])->name('api.compliance_profiles.index');
        Route::get('/system-keys', [ComplianceProfileController::class, 'getSystemKeys'])->name('api.compliance_profiles.system_keys');
        Route::get('/{id}', [ComplianceProfileController::class, 'show'])->name('api.compliance_profiles.show');
    });

    Route::group(['middleware' => ['can:settings,edit'], 'prefix' => 'compliance-profiles'], function () {
        Route::post('/', [ComplianceProfileController::class, 'store'])->name('api.compliance_profiles.store');
        Route::put('/{id}', [ComplianceProfileController::class, 'update'])->name('api.compliance_profiles.update');
        Route::post('/{id}/generate-token', [ComplianceProfileController::class, 'generateToken'])->name('api.compliance_profiles.generate_token');
        Route::post('/{id}/revoke-token', [ComplianceProfileController::class, 'revokeToken'])->name('api.compliance_profiles.revoke_token');
        Route::post('/validate-structure', [ComplianceProfileController::class, 'validateStructure'])->name('api.compliance_profiles.validate_structure');
    });

    Route::middleware('can:settings,delete')
        ->delete('/compliance-profiles/{id}', [ComplianceProfileController::class, 'destroy'])
        ->name('api.compliance_profiles.destroy');
});
