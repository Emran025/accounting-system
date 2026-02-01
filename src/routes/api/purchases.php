<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PurchasesController;
use App\Http\Controllers\Api\ApController;

// Purchases
Route::middleware('can:purchases,view')->get('/purchases', [PurchasesController::class, 'index'])->name('api.purchases.index');
Route::middleware('can:purchases,create')->post('/purchases', [PurchasesController::class, 'store'])->name('api.purchases.store');
Route::middleware('can:purchases,edit')->put('/purchases', [PurchasesController::class, 'update'])->name('api.purchases.update');
Route::middleware('can:purchases,delete')->delete('/purchases', [PurchasesController::class, 'destroy'])->name('api.purchases.destroy');
Route::middleware('can:purchases,view')->get('/requests', [PurchasesController::class, 'requests'])->name('api.requests.index');
Route::middleware('can:purchases,create')->post('/requests', [PurchasesController::class, 'storeRequest'])->name('api.requests.store');
Route::middleware('can:purchases,edit')->put('/requests', [PurchasesController::class, 'updateRequest'])->name('api.requests.update');
Route::middleware('can:purchases,edit')->post('/purchases/approve', [PurchasesController::class, 'approve'])->name('api.purchases.approve');

// AP (Suppliers)
Route::middleware('can:ap_suppliers,view')->get('/ap/suppliers', [ApController::class, 'suppliers'])->name('api.ap.suppliers');
Route::middleware('can:ap_suppliers,create')->post('/ap/suppliers', [ApController::class, 'storeSupplier'])->name('api.ap.suppliers.store');
Route::middleware('can:ap_suppliers,edit')->put('/ap/suppliers', [ApController::class, 'updateSupplier'])->name('api.ap.suppliers.update');
Route::middleware('can:ap_suppliers,delete')->delete('/ap/suppliers', [ApController::class, 'destroySupplier'])->name('api.ap.suppliers.destroy');
Route::middleware('can:ap_suppliers,view')->get('/ap/transactions', [ApController::class, 'transactions'])->name('api.ap.transactions');
Route::middleware('can:ap_suppliers,create')->post('/ap/transactions', [ApController::class, 'storeTransaction'])->name('api.ap.transactions.store');
Route::middleware('can:ap_suppliers,create')->post('/ap/payment', [ApController::class, 'recordPayment'])->name('api.ap.payment.record');
Route::middleware('can:ap_suppliers,view')->get('/ap/ledger', [ApController::class, 'supplierLedger'])->name('api.ap.ledger');
