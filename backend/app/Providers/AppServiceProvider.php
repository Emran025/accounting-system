<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
        $this->configureRateLimiting();

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

    /**
     * Configure tiered rate limiting for the API.
     *
     * Tier Design (per authenticated user, per minute):
     *   api          – 120/min – General reads (GET index/show)
     *   api-write    –  30/min – Standard mutations (POST/PUT)
     *   api-sensitive –  10/min – Financial & payroll mutations
     *   api-critical  –   5/min – GL posting, bulk operations, fiscal close
     *   api-delete   –  10/min – Destructive operations
     *   api-export   –   5/min – Report generation, data exports
     *   api-auth     –   5/min – Login attempts (by IP)
     */
    private function configureRateLimiting(): void
    {
        // General read operations — generous for UI responsiveness
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Too many requests. Please slow down.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Standard write operations (create, update)
        RateLimiter::for('api-write', function (Request $request) {
            return Limit::perMinute(30)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Write rate limit exceeded. Please wait before submitting again.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Sensitive financial & payroll operations
        RateLimiter::for('api-sensitive', function (Request $request) {
            return Limit::perMinute(10)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Rate limit exceeded for sensitive operations.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Critical operations — GL posting, bulk updates, fiscal period close
        RateLimiter::for('api-critical', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Critical operation rate limit reached. This action is throttled for safety.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Delete operations
        RateLimiter::for('api-delete', function (Request $request) {
            return Limit::perMinute(10)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Delete rate limit exceeded.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Report and export operations (often heavy queries)
        RateLimiter::for('api-export', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Report generation rate limit reached. Please wait.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Authentication — by IP, strict
        RateLimiter::for('api-auth', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Too many login attempts. Please try again later.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });
    }
}
