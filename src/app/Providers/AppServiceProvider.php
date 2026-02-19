<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Services\SalaryCalculatorInterface;
use App\Services\SalaryCalculatorService;
use App\Models\Invoice;
use App\Models\JournalVoucher;
use App\Models\Purchase;
use App\Policies\InvoicePolicy;
use App\Policies\JournalVoucherPolicy;
use App\Policies\PurchasePolicy;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind SalaryCalculator interface to implementation
        $this->app->bind(SalaryCalculatorInterface::class, SalaryCalculatorService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies for resource-level authorization
        Gate::policy(Invoice::class, InvoicePolicy::class);
        Gate::policy(JournalVoucher::class, JournalVoucherPolicy::class);
        Gate::policy(Purchase::class, PurchasePolicy::class);

        // Grant all permissions to admin users, and check specific permissions for others
        Gate::before(function ($user, $ability, $args = []) {
            // Admin always has access
            if ($user->roleRelation?->role_key === 'admin') {
                return true;
            }

            // Determine module and action
            $module = $ability;
            $action = $args[0] ?? 'view';

            if (str_contains($ability, '.')) {
                $parts = explode('.', $ability, 2);
                if (count($parts) === 2) {
                    [$module, $action] = $parts;
                }
            }

            // Map policy actions to permission columns
            $actionMap = [
                'view' => 'view',
                'create' => 'create',
                'update' => 'edit',
                'edit' => 'edit',
                'delete' => 'delete',
            ];

            if (isset($actionMap[$action])) {
                $mappedAction = $actionMap[$action];
                $permissions = \App\Services\PermissionService::loadPermissions($user->role_id);
                
                if (isset($permissions[$module][$mappedAction])) {
                    return (bool) $permissions[$module][$mappedAction];
                }
                
                // Also check wildcard permission if set in PermissionService
                if (isset($permissions['*'][$mappedAction])) {
                    return (bool) $permissions['*'][$mappedAction];
                }
            }
            
            return null;
        });
    }
}
