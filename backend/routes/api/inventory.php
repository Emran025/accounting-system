<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductsController;
use App\Http\Controllers\Api\CategoriesController;
use App\Http\Controllers\Api\BatchController;
use App\Http\Controllers\Api\PeriodicInventoryController;

// Products
Route::middleware('can:products,view')->get('/products', [ProductsController::class, 'index'])->name('api.products.index');
Route::middleware(['can:products,create', 'throttle:api-write'])->post('/products', [ProductsController::class, 'store'])->name('api.products.store');
Route::middleware(['can:products,edit', 'throttle:api-write'])->put('/products', [ProductsController::class, 'update'])->name('api.products.update');
Route::middleware(['can:products,delete', 'throttle:api-delete'])->delete('/products', [ProductsController::class, 'destroy'])->name('api.products.destroy');

// Categories
Route::middleware('can:products,view')->get('/categories', [CategoriesController::class, 'index'])->name('api.categories.index');
Route::middleware(['can:products,create', 'throttle:api-write'])->post('/categories', [CategoriesController::class, 'store'])->name('api.categories.store');
Route::middleware(['can:products,edit', 'throttle:api-write'])->put('/categories', [CategoriesController::class, 'update'])->name('api.categories.update');
Route::middleware(['can:products,delete', 'throttle:api-delete'])->delete('/categories', [CategoriesController::class, 'destroy'])->name('api.categories.destroy');

// Batch Processing
Route::middleware('can:batch_processing,view')->get('/batch', [BatchController::class, 'index'])->name('api.batch.index');
Route::middleware(['can:batch_processing,create', 'throttle:api-critical'])->post('/batch', [BatchController::class, 'store'])->name('api.batch.store');
Route::middleware(['can:batch_processing,delete', 'throttle:api-delete'])->delete('/batch', [BatchController::class, 'destroy'])->name('api.batch.destroy');

// Periodic Inventory
Route::middleware('can:products,view')->get('/inventory/periodic', [PeriodicInventoryController::class, 'index'])->name('api.inventory.periodic.index');
Route::middleware(['can:products,create', 'throttle:api-write'])->post('/inventory/periodic', [PeriodicInventoryController::class, 'store'])->name('api.inventory.periodic.store');
Route::middleware(['can:products,edit', 'throttle:api-critical'])->post('/inventory/periodic/process', [PeriodicInventoryController::class, 'process'])->name('api.inventory.periodic.process');
Route::middleware('can:products,view')->get('/inventory/periodic/valuation', [PeriodicInventoryController::class, 'valuation'])->name('api.inventory.periodic.valuation');
