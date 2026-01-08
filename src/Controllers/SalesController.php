<?php

require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../Services/SalesService.php';
require_once __DIR__ . '/../Services/PermissionService.php';

class SalesController extends Controller
{
    private $salesService;

    public function __construct()
    {
        parent::__construct();
        $this->salesService = new App\Services\SalesService();
    }

    public function handle()
    {
        if (!is_logged_in()) {
            $this->errorResponse('Unauthorized', 401);
        }

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? 'invoices';

        if ($method === 'POST') {
            PermissionService::requirePermission('sales', 'create');
            $this->store();
        } elseif ($method === 'GET') {
            PermissionService::requirePermission('sales', 'view');
            if (isset($_GET['id']) || $action === 'invoice_details') {
                $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
                $this->getInvoiceDetails($id);
            } else {
                $this->getInvoices();
            }
        } elseif ($method === 'DELETE') {
            PermissionService::requirePermission('sales', 'delete');
            $this->deleteInvoice();
        } else {
            $this->errorResponse('Method Not Allowed', 405);
        }
    }

    /**
     * Store a new invoice.
     * POST /invoices
     */
    public function store()
    {
        $input = $this->getJsonInput();

        if (empty($input)) {
            $this->errorResponse('Invalid input', 400);
            return;
        }

        // Add user_id if not provided
        if (!isset($input['user_id'])) {
            $input['user_id'] = $_SESSION['user_id'];
        }

        try {
            $invoiceId = $this->salesService->createInvoice($input);
            
            $this->successResponse([
                'id' => $invoiceId,
                'invoice_id' => $invoiceId
            ], 'Invoice created successfully');

        } catch (Exception $e) {
            $this->errorResponse($e->getMessage(), 500);
        }
    }

    private function getInvoices() {
        $params = $this->getPaginationParams();
        $limit = $params['limit'];
        $offset = $params['offset'];
        $payment_type = $_GET['payment_type'] ?? null;

        $where = "WHERE 1=1";
        $types = "";
        $vals = [];

        if ($payment_type) {
            $where .= " AND i.payment_type = ?";
            $types .= "s";
            $vals[] = $payment_type;
        }

        $sql = "SELECT i.*, u.username as cashier_name, c.name as customer_name 
                FROM invoices i 
                LEFT JOIN users u ON i.user_id = u.id 
                LEFT JOIN ar_customers c ON i.customer_id = c.id 
                $where
                ORDER BY i.created_at DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = mysqli_prepare($this->conn, $sql);
        
        $bind_types = $types . "ii";
        $bind_vals = array_merge($vals, [$limit, $offset]);
        mysqli_stmt_bind_param($stmt, $bind_types, ...$bind_vals);
        
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        $invoices = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $invoices[] = $row;
        }

        $count_sql = "SELECT COUNT(*) as total FROM invoices i $where";
        $count_stmt = mysqli_prepare($this->conn, $count_sql);
        if ($types) {
            mysqli_stmt_bind_param($count_stmt, $types, ...$vals);
        }
        mysqli_stmt_execute($count_stmt);
        $total = mysqli_fetch_assoc(mysqli_stmt_get_result($count_stmt))['total'];

        $this->paginatedResponse($invoices, $total, $params['page'], $params['limit']);
    }

    private function getInvoiceDetails($id) {
        if ($id <= 0) {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        }

        if ($id <= 0) {
            $this->errorResponse('ID is required', 400);
        }

        $stmt = mysqli_prepare($this->conn, "SELECT i.*, u.username as cashier_name, c.name as customer_name, c.phone as customer_phone, c.tax_number as customer_tax
                                          FROM invoices i 
                                          LEFT JOIN users u ON i.user_id = u.id 
                                          LEFT JOIN ar_customers c ON i.customer_id = c.id 
                                          WHERE i.id = ?");
        mysqli_stmt_bind_param($stmt, "i", $id);
        mysqli_stmt_execute($stmt);
        $invoice = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

        if (!$invoice) {
            $this->errorResponse('Invoice not found', 404);
        }

        $item_stmt = mysqli_prepare($this->conn, "SELECT it.*, p.name as product_name 
                                               FROM invoice_items it 
                                               JOIN products p ON it.product_id = p.id 
                                               WHERE it.invoice_id = ?");
        mysqli_stmt_bind_param($item_stmt, "i", $id);
        mysqli_stmt_execute($item_stmt);
        $items = [];
        $result = mysqli_stmt_get_result($item_stmt);
        while ($row = mysqli_fetch_assoc($result)) {
            $items[] = $row;
        }

        $invoice['items'] = $items;
        $this->successResponse(['data' => $invoice]);
    }

    private function deleteInvoice() {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) {
            $this->errorResponse('ID is required', 400);
        }

        mysqli_begin_transaction($this->conn);
        try {
            // 1. Get info
            $res = mysqli_query($this->conn, "SELECT * FROM invoices WHERE id = $id");
            $invoice = mysqli_fetch_assoc($res);
            if (!$invoice) throw new Exception("Invoice not found");

            // 2. Return stock
            $items_res = mysqli_query($this->conn, "SELECT * FROM invoice_items WHERE invoice_id = $id");
            while ($item = mysqli_fetch_assoc($items_res)) {
                mysqli_query($this->conn, "UPDATE products SET stock_quantity = stock_quantity + {$item['quantity']} WHERE id = {$item['product_id']}");
            }

            // 3. Reverse AR if credit
            if ($invoice['payment_type'] === 'credit' && $invoice['customer_id']) {
                $net_due = $invoice['total_amount'] - $invoice['amount_paid'];
                if ($net_due > 0) {
                    mysqli_query($this->conn, "UPDATE ar_customers SET current_balance = current_balance - $net_due WHERE id = {$invoice['customer_id']}");
                    mysqli_query($this->conn, "DELETE FROM ar_transactions WHERE reference_type = 'invoices' AND reference_id = $id");
                }
            }

            // 4. Delete invoice (cascade should handle items, but let's be safe or just mark deleted)
            // For now, hard delete as per simple requirement, or soft delete if supported.
            mysqli_query($this->conn, "DELETE FROM invoice_items WHERE invoice_id = $id");
            mysqli_query($this->conn, "DELETE FROM invoices WHERE id = $id");

            mysqli_commit($this->conn);
            log_operation('DELETE', 'invoices', $id);
            $this->successResponse([], 'Invoice deleted successfully');

        } catch (Exception $e) {
            mysqli_rollback($this->conn);
            $this->errorResponse($e->getMessage());
        }
    }
}
