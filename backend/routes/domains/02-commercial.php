<?php

use Illuminate\Support\Facades\Route;

// Supply Chain Controllers (Descending File Tree)
use App\Http\Controllers\Api\V2\SupplyChain\SupplierSourcing\ApController;
use App\Http\Controllers\Api\V2\SupplyChain\Procurement\PurchasesController;
use App\Http\Controllers\Api\V2\SupplyChain\PayablesExpenses\ApTransactionsController;

// Commercial Controllers (Descending File Tree)
use App\Http\Controllers\Api\V2\Commercial\SalesLifecycle\{SalesController, SalesQuotationController, SalesReturnController, ServiceController, ServiceSaleController};
use App\Http\Controllers\Api\V2\Commercial\RevenueReceivables\ArTransactionsController;
use App\Http\Controllers\Api\V2\Commercial\MarketingDistribution\SalesRepresentativeController;
use App\Http\Controllers\Api\V2\Commercial\CRM\ArController;
use App\Http\Controllers\Api\V2\Commercial\Marketplace\MarketplaceController;
use App\Http\Controllers\Api\V2\Commercial\Marketplace\MarketplaceInquiryController;
use App\Http\Controllers\Api\V2\Commercial\Marketplace\MarketplaceAnalyticsController;
use App\Http\Controllers\Api\V2\Commercial\Marketplace\MarketplaceMediaController;

/*
|--------------------------------------------------------------------------
| Domain Routes: 02-Commercial
|--------------------------------------------------------------------------
| Sorted and fixed to reverse the order of the file tree.
| Covers: AP, Procurement, Sales, Revenue/AR, Marketing & CRM.
|--------------------------------------------------------------------------
*/


// ── 01. Accounts Payable (SupplyChain/SupplierSourcing)
Route::group(['prefix' => 'ap', 'middleware' => 'can:ap_suppliers,view'], function () {
    Route::get('/suppliers', [ApController::class, 'suppliers'])->name('v2.ap.suppliers');
    Route::get('/ledger', [ApController::class, 'supplierLedger'])->name('v2.ap.ledger');
    
    Route::middleware(['can:ap_suppliers,create', 'throttle:api-write'])->post('/suppliers', [ApController::class, 'storeSupplier'])->name('v2.ap.suppliers.store');
    Route::middleware(['can:ap_suppliers,edit', 'throttle:api-write'])->put('/suppliers/{id}', [ApController::class, 'updateSupplier'])->name('v2.ap.suppliers.update');
    Route::middleware(['can:ap_suppliers,delete', 'throttle:api-delete'])->delete('/suppliers/{id}', [ApController::class, 'destroySupplier'])->name('v2.ap.suppliers.destroy');
});

// ── 02. Purchase Lifecycle (SupplyChain/Procurement)
Route::group(['prefix' => 'purchases', 'middleware' => 'can:purchases,view'], function () {
    Route::get('/', [PurchasesController::class, 'index'])->name('v2.purchases.index');
    Route::get('/show', [PurchasesController::class, 'show'])->name('v2.purchases.show');
    Route::get('/returns/ledger', [PurchasesController::class, 'returnsLedger'])->name('v2.purchases.returns.ledger');
    
    Route::middleware(['can:purchases,create', 'throttle:api-write'])->post('/', [PurchasesController::class, 'store'])->name('v2.purchases.store');
    Route::middleware(['can:purchases,edit', 'throttle:api-sensitive'])->post('/{id}/approve', [PurchasesController::class, 'approve'])->name('v2.purchases.approve');
    Route::middleware(['can:purchases,delete', 'throttle:api-delete'])->delete('/{id}', [PurchasesController::class, 'destroy'])->name('v2.purchases.destroy');

    Route::group(['prefix' => 'requests'], function () {
        Route::get('/', [PurchasesController::class, 'requests'])->name('v2.requests.index');
        Route::post('/', [PurchasesController::class, 'storeRequest'])->name('v2.requests.store');
        Route::post('/auto-generate', [PurchasesController::class, 'autoGenerateRequests'])->name('v2.requests.auto_generate');
        Route::put('/{id}', [PurchasesController::class, 'updateRequest'])->name('v2.requests.update');
    });
});

// ── 03. Accounts Payable Transactions (SupplyChain/PayablesExpenses)
Route::group(['prefix' => 'ap', 'middleware' => 'can:ap_suppliers,view'], function () {
    Route::get('/transactions', [ApTransactionsController::class, 'index'])->name('v2.ap.transactions');
    Route::middleware(['can:ap_suppliers,create', 'throttle:api-write'])->post('/transactions', [ApTransactionsController::class, 'store'])->name('v2.ap.transactions.store');
    Route::middleware(['can:ap_suppliers,edit', 'throttle:api-write'])->put('/transactions/{id}', [ApTransactionsController::class, 'update'])->name('v2.ap.transactions.update');
    Route::middleware(['can:ap_suppliers,delete', 'throttle:api-delete'])->delete('/transactions/{id}', [ApTransactionsController::class, 'destroy'])->name('v2.ap.transactions.destroy');
    
    // Payment Record (Former top-level route)
    Route::middleware(['can:ap_suppliers,create', 'throttle:api-sensitive'])->post('/payment', [ApTransactionsController::class, 'recordPayment'])->name('v2.ap.payments.store');
});

// ── 04. Sales Lifecycle (Commercial/SalesLifecycle)
Route::group(['prefix' => 'sales', 'middleware' => ['can:sales,view', 'module.operational:sales']], function () {
    // Invoices
    Route::get('/invoices', [SalesController::class, 'index'])->name('v2.invoices.index');
    Route::get('/invoices/{id}', [SalesController::class, 'show'])->name('v2.invoices.show');
    Route::get('/invoice_details/{id}', [SalesController::class, 'show'])->name('v2.invoices.details');
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/invoices', [SalesController::class, 'store'])->name('v2.invoices.store');
    Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/invoices/{id}', [SalesController::class, 'destroy'])->name('v2.invoices.destroy');

    // Quotations
    Route::get('/quotations', [SalesQuotationController::class, 'index'])->name('v2.sales.quotations.index');
    Route::get('/quotations/{id}', [SalesQuotationController::class, 'show'])->name('v2.sales.quotations.show');
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/quotations', [SalesQuotationController::class, 'store'])->name('v2.sales.quotations.store');
    Route::middleware(['can:sales,edit', 'throttle:api-write'])->post('/quotations/{id}/status', [SalesQuotationController::class, 'updateStatus'])->name('v2.sales.quotations.status');

    // Returns
    Route::get('/returns', [SalesReturnController::class, 'index'])->name('v2.sales_returns.index');
    Route::get('/returns/ledger', [SalesReturnController::class, 'ledger'])->name('v2.sales_returns.ledger');
    Route::get('/returns/{id}', [SalesReturnController::class, 'show'])->name('v2.sales_returns.show');
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/returns', [SalesReturnController::class, 'store'])->name('v2.sales_returns.store');

    // ZATCA (Refactored to Controller)
    Route::group(['prefix' => 'zatca'], function() {
        Route::middleware(['can:sales,edit', 'throttle:api-sensitive'])->post('/{id}/submit', [SalesController::class, 'submitZatca'])->name('v2.zatca.submit');
        Route::get('/{id}/status', [SalesController::class, 'getZatcaStatus'])->name('v2.zatca.status');
    });
});

// ── 05. Accounts Receivable Transactions (Commercial/RevenueReceivables)
Route::group(['prefix' => 'crm', 'middleware' => 'can:ar_customers,view'], function () {
    Route::get('/transactions', [ArTransactionsController::class, 'index'])->name('v2.ar.transactions.index');
    Route::get('/receipts', [ArTransactionsController::class, 'index'])->name('v2.ar.receipts.index');
    Route::middleware(['can:ar_customers,create', 'throttle:api-write'])->post('/transactions', [ArTransactionsController::class, 'store'])->name('v2.ar.transactions.store');
    Route::middleware(['can:ar_customers,delete', 'throttle:api-delete'])->delete('/transactions/{id}', [ArTransactionsController::class, 'destroy'])->name('v2.ar.transactions.destroy');
});

// ── 06. Marketing & Distribution (Commercial/MarketingDistribution)
Route::group(['prefix' => 'commercial/representatives'], function () {
    Route::middleware('can:sales,view')->group(function () {
        Route::get('/', [SalesRepresentativeController::class, 'representatives'])->name('v2.sales_representatives.index');
        Route::get('/ledger', [SalesRepresentativeController::class, 'ledger'])->name('v2.sales_representatives.ledger');
    });
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/', [SalesRepresentativeController::class, 'storeRepresentative'])->name('v2.sales_representatives.store');
    Route::middleware(['can:sales,edit', 'throttle:api-write'])->put('/', [SalesRepresentativeController::class, 'updateRepresentative'])->name('v2.sales_representatives.update');
    Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/', [SalesRepresentativeController::class, 'destroyRepresentative'])->name('v2.sales_representatives.destroy');
    Route::middleware(['can:sales,edit', 'throttle:api-write'])->post('/transactions', [SalesRepresentativeController::class, 'storeTransaction'])->name('v2.sales_representatives.transaction.store');
    Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/transactions', [SalesRepresentativeController::class, 'destroyTransaction'])->name('v2.sales_representatives.transaction.destroy');

    // Legacy Aliases
    Route::get('/legacy/sales_representatives', [SalesRepresentativeController::class, 'representatives'])->name('v2.legacy.sales_representatives.index');
    Route::post('/legacy/sales_representatives', [SalesRepresentativeController::class, 'storeRepresentative'])->name('v2.legacy.sales_representatives.store');
});

// ── 07. CRM & Customers (Commercial/CRM)
Route::group(['prefix' => 'crm', 'middleware' => 'can:ar_customers,view'], function () {
    Route::get('/customers', [ArController::class, 'customers'])->name('v2.crm.customers.index');
    Route::get('/ledger', [ArController::class, 'ledger'])->name('v2.crm.ledger');
    
    Route::middleware(['can:ar_customers,create', 'throttle:api-write'])->post('/customers', [ArController::class, 'storeCustomer'])->name('v2.crm.customers.store');
    Route::middleware(['can:ar_customers,edit', 'throttle:api-write'])->put('/customers', [ArController::class, 'updateCustomer'])->name('v2.crm.customers.update');
    Route::middleware(['can:ar_customers,delete', 'throttle:api-delete'])->delete('/customers', [ArController::class, 'destroyCustomer'])->name('v2.crm.customers.destroy');

    // Legacy Aliases
    Route::group(['prefix' => 'legacy/ar'], function () {
        Route::get('/customers', [ArController::class, 'customers'])->name('v2.legacy.ar.customers');
        Route::get('/ledger', [ArController::class, 'ledger'])->name('v2.legacy.ar.ledger');
        Route::get('/transactions', [ArTransactionsController::class, 'index'])->name('v2.legacy.ar.transactions');
    });
});

// ── 08. Marketplace Catalog & Offers (Commercial/Marketplace)
Route::group(['prefix' => 'marketplace', 'middleware' => 'can:marketplace,view'], function () {
    Route::get('/analytics/overview', [MarketplaceAnalyticsController::class, 'overview'])->name('v2.marketplace.analytics.overview');

    Route::get('/merchants', [MarketplaceController::class, 'merchants'])->name('v2.marketplace.merchants.index');
    Route::get('/merchants/{merchant}', [MarketplaceController::class, 'showMerchant'])->name('v2.marketplace.merchants.show');
    Route::middleware(['can:marketplace,create', 'throttle:api-write'])->post('/merchants', [MarketplaceController::class, 'storeMerchant'])->name('v2.marketplace.merchants.store');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->put('/merchants/{merchant}', [MarketplaceController::class, 'updateMerchant'])->name('v2.marketplace.merchants.update');
    Route::middleware(['can:marketplace,edit', 'throttle:api-sensitive'])->post('/merchants/{merchant}/verify', [MarketplaceController::class, 'verifyMerchant'])->name('v2.marketplace.merchants.verify');

    Route::get('/inquiries', [MarketplaceInquiryController::class, 'index'])->name('v2.marketplace.inquiries.index');
    Route::get('/inquiries/{inquiry}', [MarketplaceInquiryController::class, 'show'])->name('v2.marketplace.inquiries.show');
    Route::middleware(['can:marketplace,create', 'throttle:api-write'])->post('/inquiries', [MarketplaceInquiryController::class, 'store'])->name('v2.marketplace.inquiries.store');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->post('/inquiries/{inquiry}/assign', [MarketplaceInquiryController::class, 'assign'])->name('v2.marketplace.inquiries.assign');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->post('/inquiries/{inquiry}/qualify', [MarketplaceInquiryController::class, 'qualify'])->name('v2.marketplace.inquiries.qualify');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->post('/inquiries/{inquiry}/lost', [MarketplaceInquiryController::class, 'markLost'])->name('v2.marketplace.inquiries.lost');
    Route::middleware(['can:marketplace,edit', 'throttle:api-sensitive'])->post('/inquiries/{inquiry}/convert', [MarketplaceInquiryController::class, 'convert'])->name('v2.marketplace.inquiries.convert');

    Route::get('/media', [MarketplaceMediaController::class, 'index'])->name('v2.marketplace.media.index');
    Route::middleware(['can:marketplace,create', 'throttle:api-write'])->post('/media', [MarketplaceMediaController::class, 'store'])->name('v2.marketplace.media.store');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->put('/media/{asset}', [MarketplaceMediaController::class, 'update'])->name('v2.marketplace.media.update');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->post('/media/{asset}/assign', [MarketplaceMediaController::class, 'assign'])->name('v2.marketplace.media.assign');

    Route::get('/publications', [MarketplaceController::class, 'publications'])->name('v2.marketplace.publications.index');
    Route::get('/publications/{publication}', [MarketplaceController::class, 'showPublication'])->name('v2.marketplace.publications.show');
    Route::middleware(['can:marketplace,create', 'throttle:api-write'])->post('/publications', [MarketplaceController::class, 'storePublication'])->name('v2.marketplace.publications.store');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->put('/publications/{publication}', [MarketplaceController::class, 'updatePublication'])->name('v2.marketplace.publications.update');
    Route::middleware(['can:marketplace,edit', 'throttle:api-sensitive'])->post('/publications/{publication}/publish', [MarketplaceController::class, 'publishPublication'])->name('v2.marketplace.publications.publish');
    Route::middleware(['can:marketplace,edit', 'throttle:api-sensitive'])->post('/publications/{publication}/withdraw', [MarketplaceController::class, 'withdrawPublication'])->name('v2.marketplace.publications.withdraw');

    Route::get('/offers', [MarketplaceController::class, 'offers'])->name('v2.marketplace.offers.index');
    Route::get('/offers/{offer}', [MarketplaceController::class, 'showOffer'])->name('v2.marketplace.offers.show');
    Route::middleware(['can:marketplace,create', 'throttle:api-write'])->post('/offers', [MarketplaceController::class, 'storeOffer'])->name('v2.marketplace.offers.store');
    Route::middleware(['can:marketplace,edit', 'throttle:api-write'])->put('/offers/{offer}', [MarketplaceController::class, 'updateOffer'])->name('v2.marketplace.offers.update');
    Route::middleware(['can:marketplace,edit', 'throttle:api-sensitive'])->post('/offers/{offer}/publish', [MarketplaceController::class, 'publishOffer'])->name('v2.marketplace.offers.publish');
    Route::middleware(['can:marketplace,edit', 'throttle:api-sensitive'])->post('/offers/{offer}/withdraw', [MarketplaceController::class, 'withdrawOffer'])->name('v2.marketplace.offers.withdraw');

    Route::middleware('can:marketplace,edit')->group(function () {
        Route::get('/outbox', [MarketplaceController::class, 'outbox'])->name('v2.marketplace.outbox.index');
        Route::middleware('throttle:api-sensitive')->post('/outbox/dispatch', [MarketplaceController::class, 'dispatchOutbox'])->name('v2.marketplace.outbox.dispatch');
    });
});

// ── 09. Services Catalogue (Sales & Services Engine)
Route::group(['prefix' => 'services', 'middleware' => 'can:sales,view'], function () {
    Route::get('/', [ServiceController::class, 'index'])->name('v2.services.index');
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/', [ServiceController::class, 'store'])->name('v2.services.store');
    Route::middleware(['can:sales,edit', 'throttle:api-write'])->put('/{id}', [ServiceController::class, 'update'])->name('v2.services.update');
    Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/{id}', [ServiceController::class, 'destroy'])->name('v2.services.destroy');

    // Service Sales (listing, details, and creation)
    Route::get('/sales', [ServiceSaleController::class, 'index'])->name('v2.services.sales.index');
    Route::get('/sales/{id}', [ServiceSaleController::class, 'show'])->name('v2.services.sales.show');
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/sales', [ServiceSaleController::class, 'store'])->name('v2.services.sales.store');
    Route::middleware(['can:sales,delete', 'throttle:api-delete'])->delete('/sales/{id}', [ServiceSaleController::class, 'destroy'])->name('v2.services.sales.destroy');

    // Service Returns (reuses SalesReturnController — returns work at invoice level)
    Route::get('/returns', [SalesReturnController::class, 'index'])->name('v2.services.returns.index');
    Route::get('/returns/show', [SalesReturnController::class, 'show'])->name('v2.services.returns.show');
    Route::get('/returns/ledger', [SalesReturnController::class, 'ledger'])->name('v2.services.returns.ledger');
    Route::middleware(['can:sales,create', 'throttle:api-write'])->post('/returns', [SalesReturnController::class, 'store'])->name('v2.services.returns.store');
});

