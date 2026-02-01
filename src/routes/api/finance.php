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
use App\Http\Controllers\Api\ExpensesController;
use App\Http\Controllers\Api\AssetsController;
use App\Http\Controllers\Api\RevenuesController;

// General Ledger
Route::middleware('can:general_ledger,view')->get('/trial-balance', [GeneralLedgerController::class, 'trialBalance'])->name('api.gl.trial_balance');
Route::middleware('can:general_ledger,view')->get('/ledger/entries', [GeneralLedgerController::class, 'entries'])->name('api.gl.entries');
Route::middleware('can:general_ledger,view')->get('/ledger/account-activity', [GeneralLedgerController::class, 'accountActivity'])->name('api.gl.account.activity');
Route::middleware('can:general_ledger,view')->get('/ledger/account-details', [GeneralLedgerController::class, 'accountDetails'])->name('api.gl.account_details');
Route::middleware('can:general_ledger,view')->get('/ledger/balance-history', [GeneralLedgerController::class, 'accountBalanceHistory'])->name('api.gl.balance.history');

// Journal Vouchers
Route::middleware('can:journal_vouchers,view')->get('/journal-vouchers', [JournalVouchersController::class, 'index'])->name('api.jv.index');
Route::middleware('can:journal_vouchers,create')->post('/journal-vouchers', [JournalVouchersController::class, 'store'])->name('api.jv.store');
Route::middleware('can:journal_vouchers,view')->get('/journal-vouchers/{id}', [JournalVouchersController::class, 'show'])->name('api.jv.show');
Route::middleware('can:journal_vouchers,delete')->delete('/journal-vouchers/{id}', [JournalVouchersController::class, 'destroy'])->name('api.jv.destroy');
Route::post('/vouchers/{id}/post', [JournalVouchersController::class, 'post'])->name('api.vouchers.post');

// Fiscal Periods
Route::middleware('can:fiscal_periods,view')->get('/fiscal-periods', [FiscalPeriodsController::class, 'index'])->name('api.fiscal_periods.index');
Route::middleware('can:fiscal_periods,create')->post('/fiscal-periods', [FiscalPeriodsController::class, 'store'])->name('api.fiscal_periods.store');
Route::middleware('can:fiscal_periods,edit')->post('/fiscal-periods/close', [FiscalPeriodsController::class, 'close'])->name('api.fiscal_periods.close');
Route::middleware('can:fiscal_periods,edit')->post('/fiscal-periods/lock', [FiscalPeriodsController::class, 'lock'])->name('api.fiscal_periods.lock');
Route::middleware('can:fiscal_periods,edit')->post('/fiscal-periods/unlock', [FiscalPeriodsController::class, 'unlock'])->name('api.fiscal_periods.unlock');

// Chart of Accounts
Route::middleware('can:chart_of_accounts,view')->get('/accounts', [ChartOfAccountsController::class, 'index'])->name('api.accounts.index');
Route::middleware('can:chart_of_accounts,create')->post('/accounts', [ChartOfAccountsController::class, 'store'])->name('api.accounts.store');
Route::middleware('can:chart_of_accounts,edit')->put('/accounts/{id}', [ChartOfAccountsController::class, 'update'])->name('api.accounts.update');
Route::middleware('can:chart_of_accounts,delete')->delete('/accounts/{id}', [ChartOfAccountsController::class, 'destroy'])->name('api.accounts.destroy');
Route::middleware('can:chart_of_accounts,view')->get('/accounts/balances', [ChartOfAccountsController::class, 'balances'])->name('api.accounts.balances');

// Accrual Accounting
Route::middleware('can:accrual_accounting,view')->get('/accrual', [AccrualAccountingController::class, 'index'])->name('api.accrual.index');
Route::middleware('can:accrual_accounting,create')->post('/accrual', [AccrualAccountingController::class, 'store'])->name('api.accrual.store');
Route::middleware('can:accrual_accounting,edit')->put('/accrual', [AccrualAccountingController::class, 'update'])->name('api.accrual.update');

// Bank Reconciliation
Route::middleware('can:reconciliation,view')->get('/reconciliation', [BankReconciliationController::class, 'index'])->name('api.reconciliation.index');
Route::middleware('can:reconciliation,create')->post('/reconciliation', [BankReconciliationController::class, 'store'])->name('api.reconciliation.store');
Route::middleware('can:reconciliation,edit')->put('/reconciliation', [BankReconciliationController::class, 'update'])->name('api.reconciliation.update');

// Recurring Transactions
Route::middleware('can:recurring_transactions,view')->get('/recurring_transactions', [RecurringTransactionsController::class, 'index'])->name('api.recurring.index');
Route::middleware('can:recurring_transactions,create')->post('/recurring_transactions', [RecurringTransactionsController::class, 'store'])->name('api.recurring.store');
Route::middleware('can:recurring_transactions,edit')->put('/recurring_transactions', [RecurringTransactionsController::class, 'update'])->name('api.recurring.update');
Route::middleware('can:recurring_transactions,delete')->delete('/recurring_transactions', [RecurringTransactionsController::class, 'destroy'])->name('api.recurring.destroy');
Route::middleware('can:recurring_transactions,execute')->post('/recurring_transactions/process', [RecurringTransactionsController::class, 'process'])->name('api.recurring.process');

// Currencies
Route::middleware('can:settings,view')->get('/currencies', [CurrencyController::class, 'index'])->name('api.currencies.index');
Route::middleware('can:settings,edit')->post('/currencies', [CurrencyController::class, 'store'])->name('api.currencies.store');
Route::middleware('can:settings,edit')->put('/currencies/{id}', [CurrencyController::class, 'update'])->name('api.currencies.update');
Route::middleware('can:settings,delete')->delete('/currencies/{id}', [CurrencyController::class, 'destroy'])->name('api.currencies.destroy');
Route::middleware('can:settings,edit')->post('/currencies/{id}/toggle', [CurrencyController::class, 'toggleActive'])->name('api.currencies.toggle');

// Expenses
Route::middleware('can:expenses,view')->get('/expenses', [ExpensesController::class, 'index'])->name('api.expenses.index');
Route::middleware('can:expenses,create')->post('/expenses', [ExpensesController::class, 'store'])->name('api.expenses.store');
Route::middleware('can:expenses,edit')->put('/expenses', [ExpensesController::class, 'update'])->name('api.expenses.update');
Route::middleware('can:expenses,delete')->delete('/expenses', [ExpensesController::class, 'destroy'])->name('api.expenses.destroy');

// Assets
Route::middleware('can:assets,view')->get('/assets', [AssetsController::class, 'index'])->name('api.assets.index');
Route::middleware('can:assets,create')->post('/assets', [AssetsController::class, 'store'])->name('api.assets.store');
Route::middleware('can:assets,edit')->put('/assets', [AssetsController::class, 'update'])->name('api.assets.update');
Route::middleware('can:assets,delete')->delete('/assets', [AssetsController::class, 'destroy'])->name('api.assets.destroy');

// Revenues
Route::middleware('can:revenues,view')->get('/revenues', [RevenuesController::class, 'index'])->name('api.revenues.index');
Route::middleware('can:revenues,create')->post('/revenues', [RevenuesController::class, 'store'])->name('api.revenues.store');
Route::middleware('can:revenues,edit')->put('/revenues', [RevenuesController::class, 'update'])->name('api.revenues.update');
Route::middleware('can:revenues,delete')->delete('/revenues', [RevenuesController::class, 'destroy'])->name('api.revenues.destroy');
