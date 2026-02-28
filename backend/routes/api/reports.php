<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\DashboardController;

// Reports
Route::middleware(['can:reports,view', 'throttle:api-export'])->get('/reports/balance_sheet', [ReportsController::class, 'balanceSheet'])->name('api.reports.balance_sheet');
Route::middleware(['can:reports,view', 'throttle:api-export'])->get('/reports/profit_loss', [ReportsController::class, 'profitLoss'])->name('api.reports.profit_loss');
Route::middleware(['can:reports,view', 'throttle:api-export'])->get('/reports/cash_flow', [ReportsController::class, 'cashFlow'])->name('api.reports.cash_flow');
Route::middleware(['can:reports,view', 'throttle:api-export'])->get('/reports/aging_receivables', [ReportsController::class, 'agingReceivables'])->name('api.reports.aging_receivables');
Route::middleware(['can:reports,view', 'throttle:api-export'])->get('/reports/aging_payables', [ReportsController::class, 'agingPayables'])->name('api.reports.aging_payables');
Route::middleware(['can:reports,view', 'throttle:api-export'])->get('/reports/comparative', [ReportsController::class, 'comparative'])->name('api.reports.comparative');

// Dashboard
Route::middleware(['can:reports,view', 'throttle:api'])->get('/dashboard', [DashboardController::class, 'index'])->name('api.dashboard.index');
