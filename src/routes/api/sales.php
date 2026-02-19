<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SalesController;
use App\Http\Controllers\Api\SalesReturnController;
use App\Http\Controllers\Api\ZATCAInvoiceController;
use App\Http\Controllers\Api\ArController;

// Sales/Invoices
Route::middleware('can:sales,view')->get('/invoices', [SalesController::class, 'index'])->name('api.invoices.index');
Route::middleware('can:sales,create')->post('/invoices', [SalesController::class, 'store'])->name('api.invoices.store');
Route::middleware('can:sales,view')->get('/invoice_details', [SalesController::class, 'show'])->name('api.invoice_details');
Route::middleware('can:sales,delete')->delete('/invoices', [SalesController::class, 'destroy'])->name('api.invoices.destroy');

// Sales Returns
Route::middleware('can:sales,view')->get('/sales/returns', [SalesReturnController::class, 'index'])->name('api.sales_returns.index');
Route::middleware('can:sales,create')->post('/sales/returns', [SalesReturnController::class, 'store'])->name('api.sales_returns.store');
Route::middleware('can:sales,view')->get('/sales/returns/show', [SalesReturnController::class, 'show'])->name('api.sales_returns.show');
Route::middleware('can:sales,view')->get('/sales/returns/ledger', [SalesReturnController::class, 'ledger'])->name('api.sales_returns.ledger');


// ZATCA - Stricter rate limiting for external API calls
Route::post('/invoices/{invoice_id}/zatca/submit', [ZATCAInvoiceController::class, 'submit'])
    ->middleware('throttle:10,1') // 10 submissions per minute
    ->name('api.zatca.submit');
Route::get('/invoices/{invoice_id}/zatca/status', [ZATCAInvoiceController::class, 'getStatus'])->name('api.zatca.status');

// AR (Customers)
Route::middleware('can:ar_customers,view')->get('/ar/customers', [ArController::class, 'customers'])->name('api.ar.customers');
Route::middleware('can:ar_customers,create')->post('/ar/customers', [ArController::class, 'storeCustomer'])->name('api.ar.customers.store');
Route::middleware('can:ar_customers,edit')->put('/ar/customers', [ArController::class, 'updateCustomer'])->name('api.ar.customers.update');
Route::middleware('can:ar_customers,delete')->delete('/ar/customers', [ArController::class, 'destroyCustomer'])->name('api.ar.customers.destroy');
Route::middleware('can:ar_customers,view')->get('/ar/ledger', [ArController::class, 'ledger'])->name('api.ar.ledger');
Route::middleware('can:ar_customers,create')->post('/ar/transactions', [ArController::class, 'storeTransaction'])->name('api.ar.transactions.store');
Route::middleware('can:ar_customers,edit')->put('/ar/transactions', [ArController::class, 'updateTransaction'])->name('api.ar.transactions.update');
Route::middleware('can:ar_customers,delete')->delete('/ar/transactions', [ArController::class, 'destroyTransaction'])->name('api.ar.transactions.destroy');
