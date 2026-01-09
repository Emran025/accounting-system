<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Expense;
use App\Models\Revenue;
use App\Models\Asset;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;

class DashboardController extends Controller
{
    use BaseApiController;

    public function index(\Illuminate\Http\Request $request): JsonResponse
    {
        PermissionService::requirePermission('dashboard', 'view');

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

        // Total Sales
        $totalSales = Invoice::sum('total_amount');
        
        // Sales Breakdown
        $salesBreakdown = Invoice::select('payment_type', DB::raw('SUM(total_amount) as total_value'), DB::raw('COUNT(*) as total_count'))
            ->groupBy('payment_type')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->payment_type ?? 'cash' => [
                    'value' => (float)$item->total_value,
                    'count' => (int)$item->total_count,
                ]];
            })
            ->toArray();

        // Today's Sales
        $todaysSales = Invoice::whereDate('created_at', $today)->sum('total_amount');
        
        // Today's Breakdown
        $todayBreakdown = Invoice::whereDate('created_at', $today)
            ->select('payment_type', DB::raw('SUM(total_amount) as total'))
            ->groupBy('payment_type')
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

        // Expenses
        $totalExpenses = Expense::sum('amount');
        $todaysExpenses = Expense::whereDate('expense_date', $today)->sum('amount');

        // Revenues
        $totalRevenues = Revenue::sum('amount');
        $todaysRevenues = Revenue::whereDate('revenue_date', $today)->sum('amount');

        // Assets
        $totalAssets = Asset::where('status', 'active')->sum('value');

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

        return $this->successResponse([
            'daily_sales' => (float)$todaysSales,
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
        ]);
    }
}
