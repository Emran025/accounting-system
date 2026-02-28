<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UsersController;
use App\Http\Controllers\Api\RolesController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\SessionsController;
use App\Http\Controllers\Api\AuditTrailController;
use App\Http\Controllers\Api\SystemTemplateController;
use App\Http\Controllers\Api\OrgStructureController;
use App\Http\Controllers\Api\TaxEngineController;

// Organizational Structure (SAP SPRO-style)
Route::prefix('org-structure')->group(function () {
    // Read-only: require org_structure,view
    Route::middleware('can:org_structure,view')->group(function () {
        Route::get('/meta-types', [OrgStructureController::class, 'metaTypes'])->name('api.org_structure.meta_types');
        Route::get('/topology-rules', [OrgStructureController::class, 'topologyRules'])->name('api.org_structure.topology_rules');
        Route::get('/nodes', [OrgStructureController::class, 'nodes'])->name('api.org_structure.nodes');
        Route::get('/nodes/{uuid}', [OrgStructureController::class, 'showNode'])->name('api.org_structure.nodes.show');
        Route::get('/links', [OrgStructureController::class, 'links'])->name('api.org_structure.links');
        Route::get('/scope-context/{uuid}', [OrgStructureController::class, 'scopeContext'])->name('api.org_structure.scope_context');
        Route::get('/statistics', [OrgStructureController::class, 'statistics'])->name('api.org_structure.statistics');
        Route::get('/integrity-check', [OrgStructureController::class, 'integrityCheck'])->name('api.org_structure.integrity_check');
        Route::get('/change-history', [OrgStructureController::class, 'changeHistory'])->name('api.org_structure.change_history');
    });

    // Create
    Route::middleware(['can:org_structure,create', 'throttle:api-write'])->group(function () {
        Route::post('/nodes', [OrgStructureController::class, 'storeNode'])->name('api.org_structure.nodes.store');
        Route::post('/links', [OrgStructureController::class, 'storeLink'])->name('api.org_structure.links.store');
    });

    // Edit / Update
    Route::middleware(['can:org_structure,edit', 'throttle:api-write'])->group(function () {
        Route::put('/nodes/{uuid}', [OrgStructureController::class, 'updateNode'])->name('api.org_structure.nodes.update');
        Route::put('/links/{id}', [OrgStructureController::class, 'updateLink'])->name('api.org_structure.links.update');
    });

    // Bulk operations – critical tier
    Route::middleware(['can:org_structure,edit', 'throttle:api-critical'])
        ->post('/bulk-status-update', [OrgStructureController::class, 'bulkStatusUpdate'])->name('api.org_structure.bulk_status');

    // Delete
    Route::middleware(['can:org_structure,delete', 'throttle:api-delete'])->group(function () {
        Route::delete('/nodes/{uuid}', [OrgStructureController::class, 'destroyNode'])->name('api.org_structure.nodes.destroy');
        Route::delete('/links/{id}', [OrgStructureController::class, 'destroyLink'])->name('api.org_structure.links.destroy');
    });
});

// Settings
Route::middleware('can:settings,view')->get('/settings', [SettingsController::class, 'index'])->name('api.settings.index');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/settings', [SettingsController::class, 'update'])->name('api.settings.update');
Route::middleware('can:settings,view')->get('/settings/store', [SettingsController::class, 'getStoreSettings'])->name('api.settings.store');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/settings/store', [SettingsController::class, 'updateStoreSettings'])->name('api.settings.store.update');
Route::middleware('can:settings,view')->get('/settings/invoice', [SettingsController::class, 'getInvoiceSettings'])->name('api.settings.invoice');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/settings/invoice', [SettingsController::class, 'updateInvoiceSettings'])->name('api.settings.invoice.update');
Route::middleware('can:settings,view')->get('/settings/zatca', [SettingsController::class, 'getZatcaSettings'])->name('api.settings.zatca');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/settings/zatca', [SettingsController::class, 'updateZatcaSettings'])->name('api.settings.zatca.update');
Route::middleware(['can:settings,edit', 'throttle:api-sensitive'])->post('/zatca/onboard', [SettingsController::class, 'onboardZatca'])->name('api.zatca.onboard');

// Unified Tax Engine
Route::group(['middleware' => ['can:settings,view']], function () {
    Route::get('/tax-engine/setup', [TaxEngineController::class, 'getSetup'])->name('api.tax_engine.setup');
});
Route::group(['middleware' => ['can:settings,edit', 'throttle:api-write']], function () {
    Route::put('/tax-engine/authorities/{id}', [TaxEngineController::class, 'updateAuthority'])->name('api.tax_engine.authorities.update');
    Route::post('/tax-engine/types', [TaxEngineController::class, 'storeTaxType'])->name('api.tax_engine.types.store');
    Route::put('/tax-engine/types/{id}', [TaxEngineController::class, 'updateTaxType'])->name('api.tax_engine.types.update');
});
Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/tax-engine/types/{id}', [TaxEngineController::class, 'destroyTaxType'])->name('api.tax_engine.types.destroy');

// Audit Logs
Route::middleware('can:audit_trail,view')->get('/audit-logs', [AuditLogController::class, 'index'])->name('api.audit_logs.index');
Route::middleware('can:audit_trail,view')->get('/audit-trail', [AuditTrailController::class, 'index'])->name('api.audit_trail.index');

// Users
Route::middleware('can:users,view')->get('/users', [UsersController::class, 'index'])->name('api.users.index');
Route::middleware(['can:users,create', 'throttle:api-write'])->post('/users', [UsersController::class, 'store'])->name('api.users.store');
Route::middleware(['can:users,edit', 'throttle:api-write'])->put('/users', [UsersController::class, 'update'])->name('api.users.update');
Route::middleware(['can:users,delete', 'throttle:api-delete'])->delete('/users', [UsersController::class, 'destroy'])->name('api.users.destroy');

// Self-service: authenticated user can change their own password and list their sessions
Route::middleware('throttle:api-sensitive')->post('/change_password', [UsersController::class, 'changePassword'])->name('api.change_password');
Route::get('/my_sessions', [UsersController::class, 'mySessions'])->name('api.my_sessions');

// Manager list – requires employee view permission
Route::middleware('can:employees,view')->get('/manager_list', [UsersController::class, 'managerList'])->name('api.manager_list');
Route::middleware('can:settings,view')->get('/users/managers', [UsersController::class, 'managerList'])->name('api.users.managers');

// Roles
Route::middleware('can:settings,view')->get('/roles', [RolesController::class, 'index'])->name('api.roles.index');
Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/roles', [RolesController::class, 'store'])->name('api.roles.store');
Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/roles/{id}', [RolesController::class, 'destroy'])->name('api.roles.destroy');

// Sessions management – requires user management permissions
Route::middleware('can:users,view')->get('/sessions', [SessionsController::class, 'index'])->name('api.sessions.index');
Route::middleware(['can:users,delete', 'throttle:api-delete'])->delete('/sessions/{id}', [SessionsController::class, 'destroy'])->name('api.sessions.destroy');

// System Templates – require system_templates-level permissions
Route::group(['prefix' => 'templates'], function () {
    Route::middleware('can:system_templates,view')->group(function () {
        Route::get('', [SystemTemplateController::class, 'index'])->name('api.system_templates.index');
        Route::get('/approved-keys', [SystemTemplateController::class, 'getApprovedKeys'])->name('api.system_templates.approved_keys');
        Route::get('/key/{key}', [SystemTemplateController::class, 'showByKey'])->name('api.system_templates.show_by_key');
        Route::get('/type/{type}', [SystemTemplateController::class, 'showByType'])->name('api.system_templates.show_by_type');
        Route::get('/{id}', [SystemTemplateController::class, 'show'])->name('api.system_templates.show');
        Route::get('/{id}/history', [SystemTemplateController::class, 'history'])->name('api.system_templates.history');
    });

    Route::middleware(['can:system_templates,create', 'throttle:api-write'])->post('/', [SystemTemplateController::class, 'store'])->name('api.system_templates.store');
    Route::middleware(['can:system_templates,edit', 'throttle:api-write'])->put('/{id}', [SystemTemplateController::class, 'update'])->name('api.system_templates.update');
    Route::middleware(['can:system_templates,edit', 'throttle:api-write'])->post('/{id}/render', [SystemTemplateController::class, 'render'])->name('api.system_templates.render');
    Route::middleware(['can:system_templates,delete', 'throttle:api-delete'])->delete('/{id}', [SystemTemplateController::class, 'destroy'])->name('api.system_templates.destroy');
});
