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
    // Meta Types & Topology Rules
    Route::get('/meta-types', [OrgStructureController::class, 'metaTypes'])->name('api.org_structure.meta_types');
    Route::get('/topology-rules', [OrgStructureController::class, 'topologyRules'])->name('api.org_structure.topology_rules');

    // Nodes CRUD
    Route::get('/nodes', [OrgStructureController::class, 'nodes'])->name('api.org_structure.nodes');
    Route::get('/nodes/{uuid}', [OrgStructureController::class, 'showNode'])->name('api.org_structure.nodes.show');
    Route::post('/nodes', [OrgStructureController::class, 'storeNode'])->name('api.org_structure.nodes.store');
    Route::put('/nodes/{uuid}', [OrgStructureController::class, 'updateNode'])->name('api.org_structure.nodes.update');
    Route::delete('/nodes/{uuid}', [OrgStructureController::class, 'destroyNode'])->name('api.org_structure.nodes.destroy');

    // Links CRUD (new: listing & update)
    Route::get('/links', [OrgStructureController::class, 'links'])->name('api.org_structure.links');
    Route::post('/links', [OrgStructureController::class, 'storeLink'])->name('api.org_structure.links.store');
    Route::put('/links/{id}', [OrgStructureController::class, 'updateLink'])->name('api.org_structure.links.update');
    Route::delete('/links/{id}', [OrgStructureController::class, 'destroyLink'])->name('api.org_structure.links.destroy');

    // Scope Context Resolution
    Route::get('/scope-context/{uuid}', [OrgStructureController::class, 'scopeContext'])->name('api.org_structure.scope_context');

    // Statistics, Integrity, History, Bulk Operations
    Route::get('/statistics', [OrgStructureController::class, 'statistics'])->name('api.org_structure.statistics');
    Route::get('/integrity-check', [OrgStructureController::class, 'integrityCheck'])->name('api.org_structure.integrity_check');
    Route::get('/change-history', [OrgStructureController::class, 'changeHistory'])->name('api.org_structure.change_history');
    Route::post('/bulk-status-update', [OrgStructureController::class, 'bulkStatusUpdate'])->name('api.org_structure.bulk_status');
});

// Settings
Route::middleware('can:settings,view')->get('/settings', [SettingsController::class, 'index'])->name('api.settings.index');
Route::middleware('can:settings,edit')->post('/settings', [SettingsController::class, 'update'])->name('api.settings.update');
Route::middleware('can:settings,view')->get('/settings/store', [SettingsController::class, 'getStoreSettings'])->name('api.settings.store');
Route::middleware('can:settings,edit')->put('/settings/store', [SettingsController::class, 'updateStoreSettings'])->name('api.settings.store.update');
Route::middleware('can:settings,view')->get('/settings/invoice', [SettingsController::class, 'getInvoiceSettings'])->name('api.settings.invoice');
Route::middleware('can:settings,edit')->put('/settings/invoice', [SettingsController::class, 'updateInvoiceSettings'])->name('api.settings.invoice.update');
Route::middleware('can:settings,view')->get('/settings/zatca', [SettingsController::class, 'getZatcaSettings'])->name('api.settings.zatca');
Route::middleware('can:settings,edit')->put('/settings/zatca', [SettingsController::class, 'updateZatcaSettings'])->name('api.settings.zatca.update');
Route::middleware('can:settings,edit')->post('/zatca/onboard', [SettingsController::class, 'onboardZatca'])->name('api.zatca.onboard');

// Unified Tax Engine
Route::group(['middleware' => ['can:settings,view']], function () {
    Route::get('/tax-engine/setup', [TaxEngineController::class, 'getSetup'])->name('api.tax_engine.setup');
});
Route::group(['middleware' => ['can:settings,edit']], function () {
    Route::put('/tax-engine/authorities/{id}', [TaxEngineController::class, 'updateAuthority'])->name('api.tax_engine.authorities.update');
    Route::post('/tax-engine/types', [TaxEngineController::class, 'storeTaxType'])->name('api.tax_engine.types.store');
    Route::put('/tax-engine/types/{id}', [TaxEngineController::class, 'updateTaxType'])->name('api.tax_engine.types.update');
});
Route::middleware('can:settings,delete')->delete('/tax-engine/types/{id}', [TaxEngineController::class, 'destroyTaxType'])->name('api.tax_engine.types.destroy');

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

// System Templates
Route::group(['prefix' => 'templates'], function () {
    Route::get('', [SystemTemplateController::class, 'index'])->name('api.system_templates.index');
    Route::get('/approved-keys', [SystemTemplateController::class, 'getApprovedKeys'])->name('api.system_templates.approved_keys');
    Route::post('/', [SystemTemplateController::class, 'store'])->name('api.system_templates.store');
    Route::get('/key/{key}', [SystemTemplateController::class, 'showByKey'])->name('api.system_templates.show_by_key');
    Route::get('/type/{type}', [SystemTemplateController::class, 'showByType'])->name('api.system_templates.show_by_type');
    Route::get('/{id}', [SystemTemplateController::class, 'show'])->name('api.system_templates.show');
    Route::put('/{id}', [SystemTemplateController::class, 'update'])->name('api.system_templates.update');
    Route::delete('/{id}', [SystemTemplateController::class, 'destroy'])->name('api.system_templates.destroy');
    Route::get('/{id}/history', [SystemTemplateController::class, 'history'])->name('api.system_templates.history');
    Route::post('/{id}/render', [SystemTemplateController::class, 'render'])->name('api.system_templates.render');
});
