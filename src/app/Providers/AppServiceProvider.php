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
    }
}
