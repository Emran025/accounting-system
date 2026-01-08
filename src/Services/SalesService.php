<?php

declare(strict_types=1);

namespace App\Services;

use Exception;
use LedgerService;
use ChartOfAccountsMappingService;

require_once __DIR__ . '/LedgerService.php';
require_once __DIR__ . '/ChartOfAccountsMappingService.php';
require_once __DIR__ . '/../config/db.php';

class SalesService
{
    private $conn;
    private $ledgerService;
    private $coaService;

    public function __construct()
    {
        $this->conn = get_db_connection();
        $this->ledgerService = new LedgerService();
        $this->coaService = new ChartOfAccountsMappingService();
    }

    /**
     * Create a new Invoice and corresponding GL entries atomically.
     * 
     * @param array $data Invoice data including items
     * @return int Invoice ID
     * @throws Exception
     */
    public function createInvoice(array $data): int
    {
        mysqli_begin_transaction($this->conn);

        try {
            // 1. Extract Data
            $invoice_number = mysqli_real_escape_string($this->conn, $data['invoice_number'] ?? 'INV-' . time());
            $payment_type = mysqli_real_escape_string($this->conn, $data['payment_type'] ?? 'cash'); // 'cash' or 'credit'
            $customer_id = isset($data['customer_id']) ? intval($data['customer_id']) : null;
            $user_id = isset($data['user_id']) ? intval($data['user_id']) : ($_SESSION['user_id'] ?? null);
            $amount_paid = isset($data['amount_paid']) ? floatval($data['amount_paid']) : 0;
            $discount_amount = isset($data['discount_amount']) ? floatval($data['discount_amount']) : 0;
            $items = $data['items'] ?? [];

            if (empty($items)) {
                throw new Exception("Invoice must have items");
            }

            if ($payment_type === 'credit' && !$customer_id) {
                throw new Exception("Customer is required for credit sales");
            }

            // 2. Calculate Totals (and validate stock if needed)
            $subtotal = 0;
            $total_vat = 0;
            $total_cost = 0; // For COGS

            // Prepare items for insertion
            $processed_items = [];

            foreach ($items as $item) {
                $product_id = intval($item['product_id']);
                $quantity = intval($item['quantity']); // In base units (sub units)
                $unit_price = floatval($item['unit_price']);
                
                // Get product details (cost, tax status - assuming 15% VAT for simplicity or fetch per product)
                // Assuming VAT is inclusive or added? Usually added. 
                // Let's match the frontend logic which sends 'subtotal'
                // The frontend says "subtotal" is price * qty.
                // We'll calculate header level tax. Assuming prices are exclusive of tax or inclusive?
                // The DB schema has 'vat_rate' on invoice. Standard KSA is 15%.
                // Let's assume standard 15% VAT on top of unit price for now, unless frontend handled it.
                // Checking frontend again... it just sends unit_price and subtotal.
                
                $line_total = $quantity * $unit_price;
                $subtotal += $line_total;

                // For COGS: Get weighted average cost
                $prod_res = mysqli_query($this->conn, "SELECT weighted_average_cost, stock_quantity FROM products WHERE id = $product_id");
                $prod_row = mysqli_fetch_assoc($prod_res);
                $cost_price = floatval($prod_row['weighted_average_cost'] ?? 0);
                
                // Check stock
                if ($prod_row['stock_quantity'] < $quantity) {
                    throw new Exception("Insufficient stock for product ID $product_id");
                }
                
                $total_cost += ($quantity * $cost_price);

                $processed_items[] = [
                    'product_id' => $product_id,
                    'quantity' => $quantity,
                    'unit_price' => $unit_price,
                    'line_total' => $line_total,
                    'cost_price' => $cost_price
                ];

                // Update Stock
                mysqli_query($this->conn, "UPDATE products SET stock_quantity = stock_quantity - $quantity WHERE id = $product_id");
            }

            $vat_rate = 0.15; // Fixed 15% for now
            $taxable_amount = $subtotal - $discount_amount;
            $vat_amount = round($taxable_amount * $vat_rate, 2);
            $total_amount = $taxable_amount + $vat_amount;

            // Default amount_paid to total_amount for cash sales if not provided
            if ($payment_type === 'cash' && (!isset($data['amount_paid']) || $data['amount_paid'] === null)) {
                $amount_paid = $total_amount;
            }

            // 3. Create Invoice Header
            $stmt = mysqli_prepare($this->conn, "INSERT INTO invoices (invoice_number, total_amount, subtotal, vat_rate, vat_amount, discount_amount, amount_paid, payment_type, customer_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            mysqli_stmt_bind_param($stmt, "sddddddsii", $invoice_number, $total_amount, $subtotal, $vat_rate, $vat_amount, $discount_amount, $amount_paid, $payment_type, $customer_id, $user_id);
            mysqli_stmt_execute($stmt);
            $invoice_id = mysqli_insert_id($this->conn);
            mysqli_stmt_close($stmt);

            // 4. Insert Invoice Items
            $item_stmt = mysqli_prepare($this->conn, "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
            foreach ($processed_items as $p_item) {
                mysqli_stmt_bind_param($item_stmt, "iiidd", $invoice_id, $p_item['product_id'], $p_item['quantity'], $p_item['unit_price'], $p_item['line_total']);
                mysqli_stmt_execute($item_stmt);
            }
            mysqli_stmt_close($item_stmt);

            // 5. Update Customer Balance (if credit)
            if ($payment_type === 'credit' && $customer_id) {
                // If amount_paid < total_amount, the rest is debt
                // However, payment_type='credit' usually implies the whole thing is AR, and they might pay a deposit (down payment).
                // Or 'credit' means "Deferred".
                // We'll treat the net due amount as AR.
                
                $net_due = $total_amount - $amount_paid;
                
                // Add transaction to ar_transactions
                if ($net_due > 0) {
                     $ar_desc = "Invoice #$invoice_number";
                     $ar_stmt = mysqli_prepare($this->conn, "INSERT INTO ar_transactions (customer_id, type, amount, description, reference_type, reference_id, created_by) VALUES (?, 'invoice', ?, ?, 'invoices', ?, ?)");
                     mysqli_stmt_bind_param($ar_stmt, "idsii", $customer_id, $net_due, $ar_desc, $invoice_id, $user_id);
                     mysqli_stmt_execute($ar_stmt);
                     mysqli_stmt_close($ar_stmt);
                     
                     // Balance update is usually handled by triggers or recalculation function
                     // Let's call the generic update function in ArController? No, we are in Service.
                     // Just do direct update.
                     mysqli_query($this->conn, "UPDATE ar_customers SET current_balance = current_balance + $net_due WHERE id = $customer_id");
                }
            }
            
            // 6. GL Entries via LedgerService
            $gl_entries = [];

            // A. Revenue (Credit)
            $gl_entries[] = [
                'account_code' => $this->coaService->getStandardAccounts()['sales_revenue'], // Revenue
                'entry_type' => 'CREDIT',
                'amount' => $subtotal,
                'description' => "Sales Revenue - Invoice #$invoice_number"
            ];

            // B. VAT Payable (Credit)
            if ($vat_amount > 0) {
                $gl_entries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['output_vat'], // 2210
                    'entry_type' => 'CREDIT',
                    'amount' => $vat_amount,
                    'description' => "VAT Output - Invoice #$invoice_number"
                ];
            }

            // C. Debit Side (Cash + AR)
            if ($amount_paid > 0) {
                // Cash received
                $gl_entries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['cash'], // 1110
                    'entry_type' => 'DEBIT',
                    'amount' => $amount_paid,
                    'description' => "Cash Received - Invoice #$invoice_number"
                ];
            }

            $amount_due = $total_amount - $amount_paid;
            if ($amount_due > 0.01) { // Floating point tolerance
                // AR (Debit)
                $gl_entries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['accounts_receivable'], // 1120
                    'entry_type' => 'DEBIT',
                    'amount' => $amount_due,
                    'description' => "Accounts Receivable - Invoice #$invoice_number"
                ];
            }

            // D. COGS (Debit) and Inventory (Credit) - Perpetual Inventory System
            if ($total_cost > 0) {
                $gl_entries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['cogs'], // 5100
                    'entry_type' => 'DEBIT',
                    'amount' => $total_cost,
                    'description' => "Cost of Goods Sold - Invoice #$invoice_number"
                ];
                
                $gl_entries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['inventory'], // 1130
                    'entry_type' => 'CREDIT',
                    'amount' => $total_cost,
                    'description' => "Inventory usage - Invoice #$invoice_number"
                ];
            }

            // E. Sales Discount (Debit)
            if ($discount_amount > 0) {
                $gl_entries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['sales_discount'],
                    'entry_type' => 'DEBIT',
                    'amount' => $discount_amount,
                    'description' => "Sales Discount - Invoice #$invoice_number"
                ];
            }

            // Post GL
            $this->ledgerService->postTransaction(
                $gl_entries,
                'invoices',
                $invoice_id,
                null, // generate voucher number
                date('Y-m-d')
            );

            mysqli_commit($this->conn);
            return $invoice_id;

        } catch (Exception $e) {
            mysqli_rollback($this->conn);
            error_log("Invoice Creation Failed: " . $e->getMessage());
            throw new Exception("Failed to create invoices: " . $e->getMessage());
        }
    }
}
