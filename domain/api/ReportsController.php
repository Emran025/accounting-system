<?php

require_once __DIR__ . '/Controller.php';

class ReportsController extends Controller {

    public function handle() {
        if (!is_logged_in()) {
            $this->errorResponse('Unauthorized', 401);
        }

        $method = $_SERVER['REQUEST_METHOD'];
        if ($method !== 'GET') {
            $this->errorResponse('Method Not Allowed', 405);
        }

        $action = $_GET['action'] ?? '';
        
        if ($action === 'balance_sheet') {
            $this->getBalanceSheet();
        } else {
            $this->errorResponse('Invalid action');
        }
    }

    private function getBalanceSheet() {
        // 1. Assets
        // A. Cash Flow Estimation (Simplified: Total Revenue - Total Outgoings)
        $sales_res = mysqli_query($this->conn, "SELECT SUM(total_amount) as total FROM invoices");
        $sales_total = floatval(mysqli_fetch_assoc($sales_res)['total'] ?? 0);

        $other_rev_res = mysqli_query($this->conn, "SELECT SUM(amount) as total FROM revenues");
        $other_rev_total = floatval(mysqli_fetch_assoc($other_rev_res)['total'] ?? 0);

        $purchases_res = mysqli_query($this->conn, "SELECT SUM(invoice_price) as total FROM purchases");
        $purchases_total = floatval(mysqli_fetch_assoc($purchases_res)['total'] ?? 0);

        $expenses_res = mysqli_query($this->conn, "SELECT SUM(amount) as total FROM expenses");
        $expenses_total = floatval(mysqli_fetch_assoc($expenses_res)['total'] ?? 0);

        $estimated_cash = ($sales_total + $other_rev_total) - ($purchases_total + $expenses_total);

        // B. Stock Value
        $stock_res = mysqli_query($this->conn, "SELECT SUM(unit_price * stock_quantity) as total FROM products");
        $stock_value = floatval(mysqli_fetch_assoc($stock_res)['total'] ?? 0);

        // C. Fixed Assets
        $fixed_assets_res = mysqli_query($this->conn, "SELECT SUM(value) as total FROM assets WHERE status = 'active'");
        $fixed_assets_value = floatval(mysqli_fetch_assoc($fixed_assets_res)['total'] ?? 0);

        // D. Accounts Receivable
        $ar_res = mysqli_query($this->conn, "SELECT SUM(current_balance) as total FROM ar_customers");
        $ar_total = floatval(mysqli_fetch_assoc($ar_res)['total'] ?? 0);

        $total_assets = $estimated_cash + $stock_value + $fixed_assets_value + $ar_total;

        // 2. Summary stats for Income Statement (Profit/Loss)
        $net_profit = ($sales_total + $other_rev_total) - ($purchases_total + $expenses_total);

        $data = [
            'assets' => [
                'cash_estimate' => $estimated_cash,
                'stock_value' => $stock_value,
                'fixed_assets' => $fixed_assets_value,
                'accounts_receivable' => $ar_total,
                'total_assets' => $total_assets
            ],
            'income_statement' => [
                'total_sales' => $sales_total,
                'other_revenues' => $other_rev_total,
                'total_purchases' => $purchases_total,
                'total_expenses' => $expenses_total,
                'net_profit' => $net_profit
            ]
        ];

        $this->successResponse(['data' => $data]);
    }
}
