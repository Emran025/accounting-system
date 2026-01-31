<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\SalaryCalculatorInterface;
use App\Services\SalaryCalculatorService;

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
        //
    }
}
