<?php

require_once __DIR__ . '/Controller.php';

class DashboardController extends Controller {

    public function handle() {
        if (!is_logged_in()) {
            $this->errorResponse('Unauthorized', 401);
        }
        
        $this->requireMethod('GET');
        
        // Admin sees all, Sales sees limited? Or same dashboard for now?
        // Let's return general stats.
        
        $stats = [
            'total_sales' => 0,
            'total_products' => 0,
            'low_stock_products' => 0,
            'todays_sales' => 0
        ];
        
        // Total Sales (All time)
        $res = mysqli_query($this->conn, "SELECT SUM(total_amount) as total FROM invoices");
        $row = mysqli_fetch_assoc($res);
        $stats['total_sales'] = floatval($row['total'] ?? 0);
        
        // Total Products
        $res = mysqli_query($this->conn, "SELECT COUNT(*) as total FROM products");
        $row = mysqli_fetch_assoc($res);
        $stats['total_products'] = intval($row['total']);
        
        // Low Stock (< 10)
        $res = mysqli_query($this->conn, "SELECT COUNT(*) as total FROM products WHERE stock_quantity < 10");
        $row = mysqli_fetch_assoc($res);
        $stats['low_stock_products'] = intval($row['total']);
        
        // Today's Sales
        $today = date('Y-m-d');
        $res = mysqli_query($this->conn, "SELECT SUM(total_amount) as total FROM invoices WHERE DATE(created_at) = '$today'");
        $row = mysqli_fetch_assoc($res);
        $stats['todays_sales'] = floatval($row['total'] ?? 0);
        
        // Recent Activities (Last 5 invoices)
        $recent_sales = [];
        $res = mysqli_query($this->conn, "SELECT id, invoice_number, total_amount, created_at FROM invoices ORDER BY created_at DESC LIMIT 5");
        while ($row = mysqli_fetch_assoc($res)) {
            $recent_sales[] = $row;
        }
        $stats['recent_sales'] = $recent_sales;
        
        $this->successResponse(['data' => $stats]);
    }
}
