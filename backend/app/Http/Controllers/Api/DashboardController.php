<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Expense;
use App\Models\Revenue;
use App\Models\Asset;
use App\Models\GeneralLedger;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;

class DashboardController extends Controller
{
    use BaseApiController;

    public function index(\Illuminate\Http\Request $request): JsonResponse
    {


        $detail = $request->query('detail');

        if ($detail === 'low_stock') {
            $products = Product::where('stock_quantity', '<', 10)
                ->orderBy('stock_quantity')
                ->get(['id', 'name', 'stock_quantity as stock']);
            return $this->successResponse($products);
        }

        if ($detail === 'expiring_soon') {
            $products = Purchase::whereBetween('expiry_date', [now(), now()->addDays(30)])
                ->whereNotNull('expiry_date')
                ->with('product')
                ->get()
                ->map(function ($purchase) {
                    return [
                        'id' => $purchase->product_id,
                        'name' => $purchase->product?->name,
                        'expiry_date' => $purchase->expiry_date,
                        'stock' => $purchase->product?->stock_quantity,
                    ];
                });
            return $this->successResponse($products);
        }

        $today = now()->format('Y-m-d');

        // Total Sales (Revenue from General Ledger)
        $totalSales = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Revenue');
            })
            ->selectRaw("SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as net_revenue")
            ->value('net_revenue') ?? 0;
        
        // Sales Breakdown
        // Sales Breakdown (Verified by Ledger - Single Source of Truth)
        $salesBreakdown = GeneralLedger::where('reference_type', 'invoices')
            ->join('invoices', 'general_ledger.reference_id', '=', 'invoices.id')
            ->whereHas('account', function($q) { 
                $q->where('account_type', 'Revenue'); 
            })
            ->select('invoices.payment_type')
            ->selectRaw("SUM(CASE WHEN general_ledger.entry_type = 'CREDIT' THEN general_ledger.amount ELSE -general_ledger.amount END) as total_value")
            ->selectRaw('COUNT(DISTINCT invoices.id) as total_count')
            ->groupBy('invoices.payment_type')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->payment_type ?? 'cash' => [
                    'value' => (float)$item->total_value,
                    'count' => (int)$item->total_count,
                ]];
            })
            ->toArray();

        // Today's Sales (Revenue from General Ledger)
        $todaysSales = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Revenue');
            })
            ->whereDate('voucher_date', $today)
            ->selectRaw("SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as net_revenue")
            ->value('net_revenue') ?? 0;
        
        // Today's Breakdown
        // Today's Breakdown (Verified by Ledger)
        $todayBreakdown = GeneralLedger::where('reference_type', 'invoices')
            ->join('invoices', 'general_ledger.reference_id', '=', 'invoices.id')
            ->whereDate('general_ledger.voucher_date', $today)
            ->whereHas('account', function($q) { 
                $q->where('account_type', 'Revenue'); 
            })
            ->select('invoices.payment_type')
            ->selectRaw("SUM(CASE WHEN general_ledger.entry_type = 'CREDIT' THEN general_ledger.amount ELSE -general_ledger.amount END) as total")
            ->groupBy('invoices.payment_type')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->payment_type ?? 'cash' => (float)$item->total];
            })
            ->toArray();

        // Products
        $totalProducts = Product::count();
        $lowStockCount = Product::where('stock_quantity', '<', 10)->count();
        $lowStockProducts = Product::where('stock_quantity', '<', 10)
            ->orderBy('stock_quantity')
            ->limit(10)
            ->get(['id', 'name', 'stock_quantity']);

        // Expiring Products (next 30 days)
        $expiringProducts = Purchase::whereBetween('expiry_date', [now(), now()->addDays(30)])
            ->whereNotNull('expiry_date')
            ->with('product')
            ->distinct('product_id')
            ->get()
            ->map(function ($purchase) {
                return [
                    'product_id' => $purchase->product_id,
                    'product_name' => $purchase->product->name,
                    'expiry_date' => $purchase->expiry_date,
                ];
            });

        // Fix BUG-004: Financial Reporting Integrity - Use GeneralLedger as Single Source of Truth
        
        // Expenses (Debit Balance in Expense Accounts)
        $totalExpenses = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Expense');
            })
            ->selectRaw("SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as net_expense")
            ->value('net_expense') ?? 0;
        
        $todaysExpenses = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Expense');
            })
            ->whereDate('voucher_date', $today)
            ->selectRaw("SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as net_expense")
            ->value('net_expense') ?? 0;

        // Revenues (Credit Balance in Revenue Accounts - excluding Sales which is already captured above)
        $totalRevenues = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Revenue');
            })
            ->selectRaw("SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as net_revenue")
            ->value('net_revenue') ?? 0;
        
        $todaysRevenues = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Revenue');
            })
            ->whereDate('voucher_date', $today)
            ->selectRaw("SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as net_revenue")
            ->value('net_revenue') ?? 0;

        // Assets (Debit Balance in Asset Accounts)
        $totalAssets = GeneralLedger::whereHas('account', function($q) {
                $q->where('account_type', 'Asset');
            })
            ->selectRaw("SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) - SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as net_assets")
            ->value('net_assets') ?? 0;

        // Recent Sales
        $recentSales = Invoice::with(['user', 'customer'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'total_amount' => $invoice->total_amount,
                    'payment_type' => $invoice->payment_type,
                    'customer_name' => $invoice->customer?->name,
                    'created_at' => $invoice->created_at,
                ];
            });

        // Pending Requests
        $pendingRequests = \App\Models\PurchaseRequest::where('status', 'pending')
            ->with(['product', 'user'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return $this->successResponse(['data' => [
            'todays_sales' => (float)$todaysSales,
            'total_sales' => (float)$totalSales,
            'low_stock_count' => $lowStockCount,
            'low_stock_products' => $lowStockProducts,
            'expiring_products' => $expiringProducts,
            'recent_sales' => $recentSales,
            'pending_requests' => $pendingRequests,
            'sales_breakdown' => $salesBreakdown,
            'today_breakdown' => $todayBreakdown,
            'total_products' => $totalProducts,
            'total_expenses' => (float)$totalExpenses,
            'todays_expenses' => (float)$todaysExpenses,
            'total_revenues' => (float)$totalRevenues,
            'todays_revenues' => (float)$todaysRevenues,
            'total_assets' => (float)$totalAssets,
        ]]);
    }
}
