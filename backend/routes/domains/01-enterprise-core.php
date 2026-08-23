<?php

use Illuminate\Support\Facades\Route;

// Enterprise Core Controllers (Descending File Tree)
use App\Http\Controllers\Api\V2\EnterpriseCore\SystemOverview\NumberRangeController;
use App\Http\Controllers\Api\V2\EnterpriseCore\OrganizationGovernance\{
    OrgIntegrationController, OrgStructureController, OperatingContextController, SetupStateController, AuditTrailController,
    AuditLogController, SettingsController
};
use App\Http\Controllers\Api\V2\EnterpriseCore\IdentityAccess\{
    PermissionTemplateController, SessionsController, RolesController, 
    UsersController
};
use App\Http\Controllers\Api\V2\EnterpriseCore\Automation\SystemTemplateController;

/*
|--------------------------------------------------------------------------
| Domain Routes: 01-EnterpriseCore
|--------------------------------------------------------------------------
| Sorted and fixed to reverse the order of the file tree.
| Covers: IAM, Governance, Org Structure, Org Integration, Number Ranges.
|--------------------------------------------------------------------------
*/



    // ── Protected Core Routes

        // ── 01. Number Ranges (SystemOverview)
        Route::group(['prefix' => 'number-ranges', 'middleware' => 'can:settings,view'], function() {
            Route::get('/objects', [NumberRangeController::class, 'indexObjects'])->name('v2.nr.objects.index');
            Route::get('/objects/summary', [NumberRangeController::class, 'systemSummary'])->name('v2.nr.summary');
            Route::get('/objects/type/{type}', [NumberRangeController::class, 'showObjectByType'])->name('v2.nr.objects.show_by_type');
            Route::get('/objects/{id}', [NumberRangeController::class, 'showObject'])->name('v2.nr.objects.show');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/objects', [NumberRangeController::class, 'storeObject'])->name('v2.nr.objects.store');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/objects/{id}', [NumberRangeController::class, 'updateObject'])->name('v2.nr.objects.update');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/objects/{id}', [NumberRangeController::class, 'destroyObject'])->name('v2.nr.objects.destroy');

            // Groups
            Route::get('/objects/{objectId}/groups', [NumberRangeController::class, 'indexGroups'])->name('v2.nr.groups.index');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/objects/{objectId}/groups', [NumberRangeController::class, 'storeGroup'])->name('v2.nr.groups.store');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/groups/{groupId}', [NumberRangeController::class, 'updateGroup'])->name('v2.nr.groups.update');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/groups/{groupId}', [NumberRangeController::class, 'destroyGroup'])->name('v2.nr.groups.destroy');

            // Intervals
            Route::get('/objects/{objectId}/intervals', [NumberRangeController::class, 'indexIntervals'])->name('v2.nr.intervals.index');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/objects/{objectId}/intervals', [NumberRangeController::class, 'storeInterval'])->name('v2.nr.intervals.store');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/intervals/{intervalId}', [NumberRangeController::class, 'updateInterval'])->name('v2.nr.intervals.update');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/intervals/{intervalId}', [NumberRangeController::class, 'destroyInterval'])->name('v2.nr.intervals.destroy');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/intervals/{intervalId}/expand', [NumberRangeController::class, 'expandInterval'])->name('v2.nr.intervals.expand');
            Route::get('/intervals/{intervalId}/expansion-logs', [NumberRangeController::class, 'expansionLogs'])->name('v2.nr.expansion_logs');

            // Assignments
            Route::get('/objects/{objectId}/assignments', [NumberRangeController::class, 'indexAssignments'])->name('v2.nr.assignments.index');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/objects/{objectId}/assignments', [NumberRangeController::class, 'storeAssignment'])->name('v2.nr.assignments.store');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/assignments/{assignmentId}', [NumberRangeController::class, 'destroyAssignment'])->name('v2.nr.assignments.destroy');

            // Reports & Generation
            Route::get('/objects/{objectId}/fullness', [NumberRangeController::class, 'fullnessReport'])->name('v2.nr.fullness');
            Route::post('/get-next', [NumberRangeController::class, 'getNextNumber'])->name('v2.nr.get_next');
            Route::post('/next-number', [NumberRangeController::class, 'getNextNumber'])->name('v2.nr.get_next.legacy'); // Alias
            Route::post('/preview-number', [NumberRangeController::class, 'previewNextNumber'])->name('v2.nr.preview_next');
        });

        // ── 02. Org Integration (OrganizationGovernance)
        Route::group(['prefix' => 'org-integration', 'middleware' => 'can:settings,view'], function () {
            Route::post('/sync/cost-center/{id}', [OrgIntegrationController::class, 'syncCostCenter'])->name('v2.org_integration.sync_cost_center');
            Route::post('/sync/profit-center/{id}', [OrgIntegrationController::class, 'syncProfitCenter'])->name('v2.org_integration.sync_profit_center');
            Route::post('/sync/node/{uuid}', [OrgIntegrationController::class, 'syncNodeToTable'])->name('v2.org_integration.sync_node');
            Route::post('/sync/job-title/{id}', [OrgIntegrationController::class, 'syncJobTitle'])->name('v2.org_integration.sync_job_title');
            Route::get('/job-titles/{id}/mapping', [OrgIntegrationController::class, 'jobTitleMapping'])->name('v2.org_integration.job_title_mapping');
            Route::post('/center/open', [OrgIntegrationController::class, 'openCenter'])->name('v2.org_integration.open_center');
            Route::post('/center/close', [OrgIntegrationController::class, 'closeCenter'])->name('v2.org_integration.close_center');
            
            // Bulk Operations
            Route::post('/bulk-sync', [OrgIntegrationController::class, 'bulkSync'])->name('v2.org_integration.bulk_sync');
            Route::post('/bulk-sync/cost-centers', [OrgIntegrationController::class, 'bulkSyncCostCenters'])->name('v2.org_integration.bulk_sync_cost');
            Route::post('/bulk-sync/profit-centers', [OrgIntegrationController::class, 'bulkSyncProfitCenters'])->name('v2.org_integration.bulk_sync_profit');
            Route::post('/bulk-sync/nodes-to-tables', [OrgIntegrationController::class, 'bulkSyncNodesToTables'])->name('v2.org_integration.bulk_sync_nodes');
            Route::post('/bulk-sync/job-titles', [OrgIntegrationController::class, 'bulkSyncJobTitles'])->name('v2.org_integration.bulk_sync_titles');

            Route::get('/status', [OrgIntegrationController::class, 'status'])->name('v2.org_integration.status');
            Route::get('/issues', [OrgIntegrationController::class, 'issues'])->name('v2.org_integration.issues');
        });

        // ── 03. Operating Context (OrganizationGovernance)
        Route::group(['prefix' => 'operating-context', 'middleware' => 'can:settings,view'], function () {
            Route::get('/readiness', [OperatingContextController::class, 'readiness'])->name('v2.operating_context.readiness');
            Route::get('/warehouses', [OperatingContextController::class, 'warehouses'])->name('v2.operating_context.warehouses');
            Route::get('/pos-terminals', [OperatingContextController::class, 'posTerminals'])->name('v2.operating_context.pos_terminals');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/configure', [OperatingContextController::class, 'configure'])->name('v2.operating_context.configure');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/{id}/select', [OperatingContextController::class, 'select'])->name('v2.operating_context.select');
        });

        // ── 04. Setup lifecycle (OrganizationGovernance)
        Route::group(['prefix' => 'setup', 'middleware' => 'can:settings,view'], function () {
            Route::get('/state', [SetupStateController::class, 'show'])->name('v2.setup.state');
            Route::get('/organization-templates', [SetupStateController::class, 'organizationTemplates'])->name('v2.setup.organization_templates');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/organization-profile', [SetupStateController::class, 'saveOrganizationProfile'])->name('v2.setup.organization_profile.save');
            Route::middleware(['can:settings,create', 'throttle:api-critical'])->post('/apply-organization-template', [SetupStateController::class, 'applyOrganizationTemplate'])->name('v2.setup.organization_template.apply');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/modules', [SetupStateController::class, 'selectModules'])->name('v2.setup.modules.select');
            Route::middleware(['can:settings,edit', 'throttle:api-critical'])->post('/activate-selected', [SetupStateController::class, 'activateSelected'])->name('v2.setup.modules.activate_selected');
        });

        // ── 05. Org Structure (OrganizationGovernance)
        Route::group(['prefix' => 'org-structure', 'middleware' => 'can:settings,view'], function () {
            Route::get('/meta-types', [OrgStructureController::class, 'metaTypes'])->name('v2.org.meta_types');
            Route::get('/topology-rules', [OrgStructureController::class, 'topologyRules'])->name('v2.org.topology_rules');
            Route::get('/factory-calendars', [OrgStructureController::class, 'factoryCalendars'])->name('v2.org.factory_calendars');
            Route::get('/nodes', [OrgStructureController::class, 'nodes'])->name('v2.org.nodes');
            Route::get('/nodes/{uuid}', [OrgStructureController::class, 'showNode'])->name('v2.org.nodes.show');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/nodes', [OrgStructureController::class, 'storeNode'])->name('v2.org.nodes.store');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/nodes/{uuid}', [OrgStructureController::class, 'updateNode'])->name('v2.org.nodes.update');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/nodes/{uuid}', [OrgStructureController::class, 'destroyNode'])->name('v2.org.nodes.destroy');

            Route::get('/links', [OrgStructureController::class, 'links'])->name('v2.org.links');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/links', [OrgStructureController::class, 'storeLink'])->name('v2.org.links.store');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/links/{id}', [OrgStructureController::class, 'updateLink'])->name('v2.org.links.update');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/links/{id}', [OrgStructureController::class, 'destroyLink'])->name('v2.org.links.destroy');

            Route::get('/scope-context/{uuid}', [OrgStructureController::class, 'scopeContext'])->name('v2.org.scope_context');
            Route::get('/statistics', [OrgStructureController::class, 'statistics'])->name('v2.org.statistics');
            Route::get('/integrity-check', [OrgStructureController::class, 'integrityCheck'])->name('v2.org.integrity_check');
            Route::get('/module-readiness', [OrgStructureController::class, 'moduleReadiness'])->name('v2.org.module_readiness');
            Route::get('/change-history', [OrgStructureController::class, 'changeHistory'])->name('v2.org.change_history');
            Route::middleware(['can:settings,edit', 'throttle:api-critical'])->post('/bulk-status-update', [OrgStructureController::class, 'bulkStatusUpdate'])->name('v2.org.bulk_status');
        });

        // ── 04. Governance: Audit (OrganizationGovernance)
        Route::group(['middleware' => 'can:audit_trail,view'], function() {
            Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('v2.audit_logs.index');
            Route::get('/audit-trail', [AuditTrailController::class, 'index'])->name('v2.audit_trail.index');
        });

        // ── 05. Governance: Settings (OrganizationGovernance)
        Route::group(['prefix' => 'settings', 'middleware' => 'can:settings,view'], function() {
            Route::get('/', [SettingsController::class, 'index'])->name('v2.settings.index');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/', [SettingsController::class, 'update'])->name('v2.settings.update');

            // Store Settings
            Route::get('/store', [SettingsController::class, 'getStoreSettings'])->name('v2.settings.store.show');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/store', [SettingsController::class, 'updateStoreSettings'])->name('v2.settings.store.update');

            // Invoice Settings
            Route::get('/invoice', [SettingsController::class, 'getInvoiceSettings'])->name('v2.settings.invoice.show');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/invoice', [SettingsController::class, 'updateInvoiceSettings'])->name('v2.settings.invoice.update');

            // ZATCA Settings
            Route::get('/zatca', [SettingsController::class, 'getZatcaSettings'])->name('v2.settings.zatca.show');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/zatca', [SettingsController::class, 'updateZatcaSettings'])->name('v2.settings.zatca.update');
            Route::middleware(['can:settings,edit', 'throttle:api-critical'])->post('/zatca/onboard', [SettingsController::class, 'onboardZatca'])->name('v2.settings.zatca.onboard');
        });

        // ── 06. IAM: Sessions (IdentityAccess)
        Route::group(['prefix' => 'sessions', 'middleware' => 'can:users,view'], function() {
            Route::get('/', [SessionsController::class, 'index'])->name('v2.sessions.index');
            Route::middleware(['can:users,delete', 'throttle:api-delete'])->delete('/{id}', [SessionsController::class, 'destroy'])->name('v2.sessions.destroy');
        });

        // ── 07. IAM: Permission Templates (IdentityAccess)
        Route::group(['prefix' => 'permission-templates', 'middleware' => 'can:employees,view'], function() {
            Route::get('/', [PermissionTemplateController::class, 'index'])->name('v2.permission_templates.index');
            Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/', [PermissionTemplateController::class, 'store'])->name('v2.permission_templates.store');
            Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/{id}', [PermissionTemplateController::class, 'update'])->name('v2.permission_templates.update');
            Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->post('/apply', [PermissionTemplateController::class, 'apply'])->name('v2.permission_templates.apply');
        });

        // ── 08. IAM: Roles (IdentityAccess)
        Route::group(['prefix' => 'roles', 'middleware' => 'can:settings,view'], function() {
            Route::get('/', [RolesController::class, 'index'])->name('v2.roles.index');
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/', [RolesController::class, 'store'])->name('v2.roles.store');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/{id}', [RolesController::class, 'destroy'])->name('v2.roles.destroy');
        });

        // ── 09. IAM: Users (IdentityAccess)
        Route::group(['prefix' => 'users'], function() {
            Route::group(['middleware' => 'can:users,view'], function() {
                Route::get('/', [UsersController::class, 'index'])->name('v2.users.index');
                Route::get('/managers', [UsersController::class, 'managerList'])->name('v2.users.managers');
            });
            Route::middleware(['can:users,create', 'throttle:api-write'])->post('/', [UsersController::class, 'store'])->name('v2.users.store');
            Route::middleware(['can:users,edit', 'throttle:api-write'])->put('/{id}', [UsersController::class, 'update'])->name('v2.users.update');
            Route::middleware(['can:users,delete', 'throttle:api-delete'])->delete('/{id}', [UsersController::class, 'destroy'])->name('v2.users.destroy');
        });

        Route::post('/change_password', [UsersController::class, 'changePassword'])->middleware('throttle:api-sensitive')->name('v2.change_password');
        Route::get('/my_sessions', [UsersController::class, 'mySessions'])->name('v2.my_sessions');
        Route::get('/manager_list', [UsersController::class, 'managerList'])->name('v2.manager_list');
        Route::get('/user-roles', [UsersController::class, 'roles'])->name('v2.user_roles.index');

        // ── 10. Governance: Templates (Automation)
        Route::group(['prefix' => 'system-templates', 'middleware' => 'can:settings,view'], function() {
            Route::get('/', [SystemTemplateController::class, 'index'])->name('v2.templates.index');
            Route::get('/approved-keys', [SystemTemplateController::class, 'getApprovedKeys'])->name('v2.templates.approved_keys');
            Route::get('/key/{key}', [SystemTemplateController::class, 'showByKey'])->name('v2.templates.show_by_key');
            Route::get('/type/{type}', [SystemTemplateController::class, 'showByType'])->name('v2.templates.show_by_type');
            Route::get('/{id}', [SystemTemplateController::class, 'show'])->name('v2.templates.show');
            Route::get('/{id}/history', [SystemTemplateController::class, 'history'])->name('v2.templates.history');
            
            Route::middleware(['can:settings,create', 'throttle:api-write'])->post('/', [SystemTemplateController::class, 'store'])->name('v2.templates.store');
            Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/{id}', [SystemTemplateController::class, 'update'])->name('v2.templates.update');
            Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/{id}', [SystemTemplateController::class, 'destroy'])->name('v2.templates.destroy');
            Route::post('/render', [SystemTemplateController::class, 'render'])->name('v2.templates.render');

            // Legacy Compatibility Alias
            Route::group(['prefix' => 'legacy'], function () {
                Route::get('/templates', [SystemTemplateController::class, 'index'])->name('v2.legacy.templates.index');
                Route::post('/templates', [SystemTemplateController::class, 'store'])->name('v2.legacy.templates.store');
            });
        });
