<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SalesController;
use App\Http\Controllers\Api\SalesReturnController;
use App\Http\Controllers\Api\ZATCAInvoiceController;
use App\Http\Controllers\Api\ArController;
use App\Http\Controllers\Api\ArTransactionsController;

// Sales/Invoices
Route::middleware('can:sales,view')->get('/invoices', [SalesController::class, 'index'])->name('api.invoices.index');
Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/invoices', [SalesController::class, 'store'])->name('api.invoices.store');
Route::middleware('can:sales,view')->get('/invoice_details', [SalesController::class, 'show'])->name('api.invoice_details');
Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/invoices', [SalesController::class, 'destroy'])->name('api.invoices.destroy');

// Sales Returns
Route::middleware('can:sales,view')->get('/sales/returns', [SalesReturnController::class, 'index'])->name('api.sales_returns.index');
Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/sales/returns', [SalesReturnController::class, 'store'])->name('api.sales_returns.store');
Route::middleware('can:sales,view')->get('/sales/returns/show', [SalesReturnController::class, 'show'])->name('api.sales_returns.show');
Route::middleware('can:sales,view')->get('/sales/returns/ledger', [SalesReturnController::class, 'ledger'])->name('api.sales_returns.ledger');


// ZATCA - Stricter rate limiting for external API calls
Route::middleware(['can:sales,edit', 'throttle:api-sensitive'])->post('/invoices/{invoice_id}/zatca/submit', [ZATCAInvoiceController::class, 'submit'])->name('api.zatca.submit');
Route::middleware('can:sales,view')->get('/invoices/{invoice_id}/zatca/status', [ZATCAInvoiceController::class, 'getStatus'])->name('api.zatca.status');

// AR (Customers)
Route::middleware('can:ar_customers,view')->get('/ar/customers', [ArController::class, 'customers'])->name('api.ar.customers');
Route::middleware(['can:ar_customers,create', 'throttle:api-write'])->post('/ar/customers', [ArController::class, 'storeCustomer'])->name('api.ar.customers.store');
Route::middleware(['can:ar_customers,edit', 'throttle:api-write'])->put('/ar/customers', [ArController::class, 'updateCustomer'])->name('api.ar.customers.update');
Route::middleware(['can:ar_customers,delete', 'throttle:api-delete'])->delete('/ar/customers', [ArController::class, 'destroyCustomer'])->name('api.ar.customers.destroy');
Route::middleware('can:ar_customers,view')->get('/ar/ledger', [ArController::class, 'ledger'])->name('api.ar.ledger');

Route::middleware('can:ar_customers,view')->get('/ar/transactions', [ArTransactionsController::class, 'index'])->name('api.ar.transactions');
Route::middleware(['can:ar_customers,create', 'throttle:api-write'])->post('/ar/transactions', [ArTransactionsController::class, 'store'])->name('api.ar.transactions.store');
Route::middleware(['can:ar_customers,edit', 'throttle:api-write'])->put('/ar/transactions', [ArTransactionsController::class, 'update'])->name('api.ar.transactions.update');
Route::middleware(['can:ar_customers,delete', 'throttle:api-delete'])->delete('/ar/transactions/{id}', [ArTransactionsController::class, 'destroy'])->name('api.ar.transactions.destroy');
Route::middleware('can:ar_customers,view')->get('/ar/receipts', [ArTransactionsController::class, 'index'])->name('api.ar.receipts');


// Sales Representatives
Route::middleware('can:sales,view')->get('/sales_representatives', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'representatives'])->name('api.sales_representatives.index');
Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/sales_representatives', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'storeRepresentative'])->name('api.sales_representatives.store');
Route::middleware(['can:sales,edit', 'throttle:api-write'])->put('/sales_representatives', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'updateRepresentative'])->name('api.sales_representatives.update');
Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/sales_representatives', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'destroyRepresentative'])->name('api.sales_representatives.destroy');
Route::middleware('can:sales,view')->get('/sales_representatives/ledger', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'ledger'])->name('api.sales_representatives.ledger');
Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/sales_representatives/transactions', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'storeTransaction'])->name('api.sales_representatives.transactions.store');
Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/sales_representatives/transactions', [\App\Http\Controllers\Api\SalesRepresentativeController::class, 'destroyTransaction'])->name('api.sales_representatives.transactions.destroy');
