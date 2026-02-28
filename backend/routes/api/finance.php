<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\GeneralLedgerController;
use App\Http\Controllers\Api\JournalVouchersController;
use App\Http\Controllers\Api\FiscalPeriodsController;
use App\Http\Controllers\Api\ChartOfAccountsController;
use App\Http\Controllers\Api\AccrualAccountingController;
use App\Http\Controllers\Api\BankReconciliationController;
use App\Http\Controllers\Api\RecurringTransactionsController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\CurrencyPolicyController;
use App\Http\Controllers\Api\ExpensesController;
use App\Http\Controllers\Api\AssetsController;
use App\Http\Controllers\Api\RevenuesController;

// General Ledger (read-only views)
Route::middleware('can:general_ledger,view')->get('/trial-balance', [GeneralLedgerController::class, 'trialBalance'])->name('api.gl.trial_balance');
Route::middleware('can:general_ledger,view')->get('/ledger/entries', [GeneralLedgerController::class, 'entries'])->name('api.gl.entries');
Route::middleware('can:general_ledger,view')->get('/ledger/account-activity', [GeneralLedgerController::class, 'accountActivity'])->name('api.gl.account_activity');
Route::middleware('can:general_ledger,view')->get('/ledger/account-details', [GeneralLedgerController::class, 'accountDetails'])->name('api.gl.account_details');
Route::middleware('can:general_ledger,view')->get('/ledger/balance-history', [GeneralLedgerController::class, 'accountBalanceHistory'])->name('api.gl.balance_history');


// Journal Vouchers
Route::middleware('can:journal_vouchers,view')->get('/journal-vouchers', [JournalVouchersController::class, 'index'])->name('api.journal_vouchers.index');
Route::middleware(['can:journal_vouchers,create', 'throttle:api-sensitive'])->post('/journal-vouchers', [JournalVouchersController::class, 'store'])->name('api.journal_vouchers.store');
Route::middleware('can:journal_vouchers,view')->get('/journal-vouchers/{id}', [JournalVouchersController::class, 'show'])->name('api.journal_vouchers.show');
Route::middleware(['can:journal_vouchers,delete', 'throttle:api-delete'])->delete('/journal-vouchers/{id}', [JournalVouchersController::class, 'destroy'])->name('api.journal_vouchers.destroy');

// GL Posting – CRITICAL: writes directly to the General Ledger
Route::middleware(['can:journal_vouchers,edit', 'throttle:api-critical'])->post('/vouchers/{id}/post', [JournalVouchersController::class, 'post'])->name('api.vouchers.post');

// Fiscal Periods
Route::middleware('can:fiscal_periods,view')->get('/fiscal-periods', [FiscalPeriodsController::class, 'index'])->name('api.fiscal_periods.index');
Route::middleware(['can:fiscal_periods,create', 'throttle:api-sensitive'])->post('/fiscal-periods', [FiscalPeriodsController::class, 'store'])->name('api.fiscal_periods.store');
Route::middleware(['can:fiscal_periods,edit', 'throttle:api-critical'])->post('/fiscal-periods/close', [FiscalPeriodsController::class, 'close'])->name('api.fiscal_periods.close');
Route::middleware(['can:fiscal_periods,edit', 'throttle:api-critical'])->post('/fiscal-periods/lock', [FiscalPeriodsController::class, 'lock'])->name('api.fiscal_periods.lock');
Route::middleware(['can:fiscal_periods,edit', 'throttle:api-critical'])->post('/fiscal-periods/unlock', [FiscalPeriodsController::class, 'unlock'])->name('api.fiscal_periods.unlock');

// Chart of Accounts
Route::middleware('can:chart_of_accounts,view')->get('/accounts', [ChartOfAccountsController::class, 'index'])->name('api.accounts.index');
Route::middleware(['can:chart_of_accounts,create', 'throttle:api-write'])->post('/accounts', [ChartOfAccountsController::class, 'store'])->name('api.accounts.store');
Route::middleware(['can:chart_of_accounts,edit', 'throttle:api-write'])->put('/accounts/{id}', [ChartOfAccountsController::class, 'update'])->name('api.accounts.update');
Route::middleware(['can:chart_of_accounts,delete', 'throttle:api-delete'])->delete('/accounts/{id}', [ChartOfAccountsController::class, 'destroy'])->name('api.accounts.destroy');
Route::middleware('can:chart_of_accounts,view')->get('/accounts/balances', [ChartOfAccountsController::class, 'balances'])->name('api.accounts.balances');

// Accrual Accounting
Route::middleware('can:accrual_accounting,view')->get('/accrual', [AccrualAccountingController::class, 'index'])->name('api.accrual.index');
Route::middleware(['can:accrual_accounting,create', 'throttle:api-sensitive'])->post('/accrual', [AccrualAccountingController::class, 'store'])->name('api.accrual.store');
Route::middleware(['can:accrual_accounting,edit', 'throttle:api-sensitive'])->put('/accrual', [AccrualAccountingController::class, 'update'])->name('api.accrual.update');

// Bank Reconciliation
Route::middleware('can:reconciliation,view')->get('/reconciliation', [BankReconciliationController::class, 'index'])->name('api.reconciliation.index');
Route::middleware(['can:reconciliation,create', 'throttle:api-sensitive'])->post('/reconciliation', [BankReconciliationController::class, 'store'])->name('api.reconciliation.store');
Route::middleware(['can:reconciliation,edit', 'throttle:api-sensitive'])->put('/reconciliation', [BankReconciliationController::class, 'update'])->name('api.reconciliation.update');

// Recurring Transactions
Route::middleware('can:recurring_transactions,view')->get('/recurring_transactions', [RecurringTransactionsController::class, 'index'])->name('api.recurring.index');
Route::middleware(['can:recurring_transactions,create', 'throttle:api-write'])->post('/recurring_transactions', [RecurringTransactionsController::class, 'store'])->name('api.recurring.store');
Route::middleware(['can:recurring_transactions,edit', 'throttle:api-write'])->put('/recurring_transactions', [RecurringTransactionsController::class, 'update'])->name('api.recurring.update');
Route::middleware(['can:recurring_transactions,delete', 'throttle:api-delete'])->delete('/recurring_transactions', [RecurringTransactionsController::class, 'destroy'])->name('api.recurring.destroy');
Route::middleware(['can:recurring_transactions,execute', 'throttle:api-critical'])->post('/recurring_transactions/process', [RecurringTransactionsController::class, 'process'])->name('api.recurring.process');

// Currencies
Route::middleware('can:settings,view')->get('/currencies', [CurrencyController::class, 'index'])->name('api.currencies.index');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/currencies', [CurrencyController::class, 'store'])->name('api.currencies.store');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->put('/currencies/{id}', [CurrencyController::class, 'update'])->name('api.currencies.update');
Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/currencies/{id}', [CurrencyController::class, 'destroy'])->name('api.currencies.destroy');
Route::middleware(['can:settings,edit', 'throttle:api-write'])->post('/currencies/{id}/toggle', [CurrencyController::class, 'toggleActive'])->name('api.currencies.toggle');

// Currency Policies (Multi-Currency Governance Framework)
Route::prefix('currency-policies')->group(function () {
    // Policy Management – reads
    Route::middleware('can:settings,view')->get('/', [CurrencyPolicyController::class, 'index'])->name('api.currency_policies.index');
    Route::middleware('can:settings,view')->get('/active', [CurrencyPolicyController::class, 'getActivePolicy'])->name('api.currency_policies.active');
    Route::middleware('can:settings,view')->get('/types', [CurrencyPolicyController::class, 'getPolicyTypes'])->name('api.currency_policies.types');
    Route::middleware('can:settings,view')->get('/{id}', [CurrencyPolicyController::class, 'show'])->name('api.currency_policies.show');

    // Policy Management – writes
    Route::middleware(['can:settings,create', 'throttle:api-sensitive'])->post('/', [CurrencyPolicyController::class, 'store'])->name('api.currency_policies.store');
    Route::middleware(['can:settings,edit', 'throttle:api-sensitive'])->put('/{id}', [CurrencyPolicyController::class, 'update'])->name('api.currency_policies.update');
    Route::middleware(['can:settings,edit', 'throttle:api-critical'])->post('/{id}/activate', [CurrencyPolicyController::class, 'activate'])->name('api.currency_policies.activate');
    Route::middleware(['can:settings,delete', 'throttle:api-delete'])->delete('/{id}', [CurrencyPolicyController::class, 'destroy'])->name('api.currency_policies.destroy');
    
    // Exchange Rates
    Route::middleware('can:settings,view')->get('/exchange-rates/history', [CurrencyPolicyController::class, 'getExchangeRateHistory'])->name('api.currency_policies.rates.history');
    Route::middleware('can:settings,view')->get('/exchange-rates/current', [CurrencyPolicyController::class, 'getExchangeRate'])->name('api.currency_policies.rates.current');
    Route::middleware(['can:settings,edit', 'throttle:api-sensitive'])->post('/exchange-rates', [CurrencyPolicyController::class, 'recordExchangeRate'])->name('api.currency_policies.rates.store');
    
    // Currency Operations
    Route::middleware(['can:settings,view', 'throttle:api-write'])->post('/convert', [CurrencyPolicyController::class, 'convert'])->name('api.currency_policies.convert');
    Route::middleware(['can:settings,edit', 'throttle:api-critical'])->post('/revaluate', [CurrencyPolicyController::class, 'processRevaluation'])->name('api.currency_policies.revaluate');
});

// Expenses
Route::middleware('can:expenses,view')->get('/expenses', [ExpensesController::class, 'index'])->name('api.expenses.index');
Route::middleware(['can:expenses,create', 'throttle:api-write'])->post('/expenses', [ExpensesController::class, 'store'])->name('api.expenses.store');
Route::middleware(['can:expenses,edit', 'throttle:api-write'])->put('/expenses', [ExpensesController::class, 'update'])->name('api.expenses.update');
Route::middleware(['can:expenses,delete', 'throttle:api-delete'])->delete('/expenses', [ExpensesController::class, 'destroy'])->name('api.expenses.destroy');

// Assets
Route::middleware('can:assets,view')->get('/assets', [AssetsController::class, 'index'])->name('api.assets.index');
Route::middleware(['can:assets,create', 'throttle:api-write'])->post('/assets', [AssetsController::class, 'store'])->name('api.assets.store');
Route::middleware(['can:assets,edit', 'throttle:api-write'])->put('/assets', [AssetsController::class, 'update'])->name('api.assets.update');
Route::middleware(['can:assets,delete', 'throttle:api-delete'])->delete('/assets', [AssetsController::class, 'destroy'])->name('api.assets.destroy');

// Revenues
Route::middleware('can:revenues,view')->get('/revenues', [RevenuesController::class, 'index'])->name('api.revenues.index');
Route::middleware(['can:revenues,create', 'throttle:api-write'])->post('/revenues', [RevenuesController::class, 'store'])->name('api.revenues.store');
Route::middleware(['can:revenues,edit', 'throttle:api-write'])->put('/revenues', [RevenuesController::class, 'update'])->name('api.revenues.update');
Route::middleware(['can:revenues,delete', 'throttle:api-delete'])->delete('/revenues', [RevenuesController::class, 'destroy'])->name('api.revenues.destroy');
