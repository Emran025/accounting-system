<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ArCustomer;
use App\Models\ArTransaction;
use App\Models\GeneralLedger;
use App\Models\GovernmentFee;
use App\Models\InvoiceFee;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SalesService
{
    private LedgerService $ledgerService;
    private ChartOfAccountsMappingService $coaService;
    private InventoryCostingService $costingService;

    public function __construct(
        LedgerService $ledgerService,
        ChartOfAccountsMappingService $coaService,
        InventoryCostingService $costingService
    ) {
        $this->ledgerService = $ledgerService;
        $this->coaService = $coaService;
        $this->costingService = $costingService;
    }

    public function createInvoice(array $data): int
    {
        return DB::transaction(function () use ($data) {
            // Extract data
            $invoiceNumber = $data['invoice_number'] ?? 'INV-' . time();
            $paymentType = $data['payment_type'] ?? 'cash';
            $customerId = $data['customer_id'] ?? null;
            $userId = $data['user_id'] ?? auth()->id();
            if (!$userId) throw new \Exception("User ID is required");
            $amountPaid = (float)($data['amount_paid'] ?? 0);
            $discountAmount = (float)($data['discount_amount'] ?? 0);
            $currencyId = $data['currency_id'] ?? null;
            $exchangeRate = $data['exchange_rate'] ?? null;
            $items = $data['items'] ?? [];

            if (empty($items)) {
                throw new \Exception("Invoice must have items");
            }

            if ($paymentType === 'credit' && !$customerId) {
                throw new \Exception("Customer is required for credit sales");
            }

            // Calculate totals and validate stock
            $subtotal = 0;
            $totalVat = 0;
            $totalCost = 0;
            $processedItems = [];

            foreach ($items as $item) {
                $productId = (int)$item['product_id'];
                $quantity = (float)$item['quantity']; // User Input Quantity
                $unitType = $item['unit_type'] ?? 'sub';
                $unitPrice = (float)$item['unit_price'];

                $product = Product::findOrFail($productId);

                // CRITICAL FIX (BUG-001): Enforce Pricing Floor - Server Sovereignty
                // The system must protect against revenue leakage via price manipulation
                // Use weighted_average_cost (actual DB field) as the cost basis
                $costBasis = (float)($product->weighted_average_cost ?? 0);
                $minProfitMargin = (float)($product->minimum_profit_margin ?? 0);
                $minimumAllowedPrice = $costBasis + $minProfitMargin;

                if ($costBasis > 0 && $unitPrice < $minimumAllowedPrice) {
                    throw new \Exception(
                        "Price violation for '{$product->name}': " .
                        "Submitted price ({$unitPrice}) is below minimum allowable price ({$minimumAllowedPrice}). " .
                        "[Cost: {$costBasis} + Margin: {$minProfitMargin}]"
                    );
                }

                // Calculate Stock Impact
                $conversionFactor = 1;
                if ($unitType === 'main' || $unitType === 'package') {
                     $conversionFactor = $product->items_per_unit ?? 1;
                }
                
                $stockDeduction = $quantity * $conversionFactor;

                // Check stock
                if ($product->stock_quantity < $stockDeduction) {
                    throw new \Exception("Insufficient stock for product: {$product->name}");
                }

                $lineTotal = $quantity * $unitPrice;
                $subtotal += $lineTotal;

                // We will calculate Cost (COGS) in the next loop using InventoryCostingService
                // to ensure we have the Invoice ID for reference and atomic execution.

                $processedItems[] = [
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'stock_deduction' => $stockDeduction,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                    'unit_type' => $unitType,
                ];

                // Update stock (Reservation)
                $product->decrement('stock_quantity', $stockDeduction);
            }

            // Fix BUG-002: Enforce Server Sovereignty for Tax Rates
            // We strictly use the system configuration and ignore any client-provided rate.
            // Config stores VAT as decimal (0.15 = 15%)
            $vatRate = (float)config('accounting.vat_rate', 0.0); 
            $taxableAmount = $subtotal - $discountAmount;
            $vatAmount = round($taxableAmount * $vatRate, 2);

            // Calculate Government Fees (Kharaaj)
            // Fetch active fees
            $activeFees = GovernmentFee::where('is_active', true)->with('account')->get();
            $totalFees = 0;
            $calculatedFees = [];

            foreach ($activeFees as $fee) {
                // Calculate percentage based fee on Taxable Amount (Revenue post-discount)
                $feeVal = 0;
                if ($fee->percentage > 0) {
                    $feeVal += round($taxableAmount * ($fee->percentage / 100), 2);
                }
                if ($fee->fixed_amount > 0) {
                    $feeVal += $fee->fixed_amount; // Per Invoice Fee
                }
                
                if ($feeVal > 0) {
                    $totalFees += $feeVal;
                    $calculatedFees[] = [
                        'fee_id' => $fee->id,
                        'fee_name' => $fee->name,
                        'fee_percentage' => $fee->percentage,
                        'amount' => $feeVal,
                        'account_code' => $fee->account->account_code ?? null 
                    ];
                }
            }

            $totalAmount = $taxableAmount + $vatAmount + $totalFees;

            // Default amount_paid for cash sales
            if ($paymentType === 'cash' && (!isset($data['amount_paid']) || $data['amount_paid'] === null)) {
                $amountPaid = $totalAmount;
            }

            // Create invoice header
            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'total_amount' => $totalAmount,
                'subtotal' => $subtotal,
                'vat_rate' => $vatRate,
                'vat_amount' => $vatAmount,
                'discount_amount' => $discountAmount,
                'amount_paid' => $amountPaid,
                'payment_type' => $paymentType,
                'customer_id' => $customerId,
                'user_id' => $userId,
                'currency_id' => $currencyId,
                'exchange_rate' => $exchangeRate,
            ]);

            // Insert invoice items
            // Insert invoice items and Calculate Real COGS
            $totalCost = 0;

            foreach ($processedItems as $item) {
                // Critical Fix (BUG-003): Use Costing Service to deplete layers
                // Use stock_deduction (Base Units) for costing
                $lineCost = $this->costingService->recordSale(
                    $item['product_id'],
                    $invoice->id,
                    $item['stock_deduction'], 
                    config('accounting.inventory.costing_method', 'FIFO')
                );
                $totalCost += $lineCost;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['line_total'],
                    'unit_type' => $item['unit_type'],
                ]);
            }

            // Save Invoice Fees
            foreach ($calculatedFees as $calcFee) {
                InvoiceFee::create([
                    'invoice_id' => $invoice->id,
                    'fee_id' => $calcFee['fee_id'],
                    'fee_name' => $calcFee['fee_name'],
                    'fee_percentage' => $calcFee['fee_percentage'],
                    'amount' => $calcFee['amount']
                ]);
            }

            // Update customer balance (if credit)
            // Update customer balance (if credit)
            if ($paymentType === 'credit' && $customerId) {
                // 1. Record the full invoice amount as a debt
                ArTransaction::create([
                    'customer_id' => $customerId,
                    'type' => 'invoice',
                    'amount' => $totalAmount,
                    'description' => "Invoice #$invoiceNumber",
                    'reference_type' => 'invoices',
                    'reference_id' => $invoice->id,
                    'created_by' => $userId,
                ]);

                ArCustomer::where('id', $customerId)
                    ->increment('current_balance', $totalAmount);

                // 2. Record the payment as a separate credit entry (Prepayment/Down Payment)
                if ($amountPaid > 0) {
                     ArTransaction::create([
                        'customer_id' => $customerId,
                        'type' => 'receipt', // Using 'receipt' as per standard convention for incoming money
                        'amount' => $amountPaid,
                        'description' => "Payment for Invoice #$invoiceNumber",
                        'reference_type' => 'invoices',
                        'reference_id' => $invoice->id, // Linking to same invoice
                        'created_by' => $userId,
                    ]);

                     ArCustomer::where('id', $customerId)
                        ->decrement('current_balance', $amountPaid);
                }
            }

            // GL Entries
            // GL Entries
            if ($paymentType === 'credit') {
                // --- Transaction 1: The Invoice (Accrual Method) ---
                $invoiceEntries = [];

                // Credit Side (Revenue, VAT, Fees)
                 $invoiceEntries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['sales_revenue'],
                    'entry_type' => 'CREDIT',
                    'amount' => $subtotal,
                    'description' => "Sales Revenue - Invoice #$invoiceNumber"
                ];

                if ($vatAmount > 0) {
                    $invoiceEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['output_vat'],
                        'entry_type' => 'CREDIT',
                        'amount' => $vatAmount,
                        'description' => "VAT Output - Invoice #$invoiceNumber"
                    ];
                }

                foreach ($calculatedFees as $calcFee) {
                    if ($calcFee['account_code']) {
                         $invoiceEntries[] = [
                            'account_code' => $calcFee['account_code'],
                            'entry_type' => 'CREDIT',
                            'amount' => $calcFee['amount'],
                            'description' => "Fee: {$calcFee['fee_name']} - Invoice #$invoiceNumber"
                        ];
                    }
                }

                // Debit Side (AR - Full Amount)
                $invoiceEntries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['accounts_receivable'],
                    'entry_type' => 'DEBIT',
                    'amount' => $totalAmount,
                    'description' => "Accounts Receivable - Invoice #$invoiceNumber"
                ];

                // Debit Discount
                if ($discountAmount > 0) {
                    $invoiceEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['sales_discount'],
                        'entry_type' => 'DEBIT',
                        'amount' => $discountAmount,
                        'description' => "Sales Discount - Invoice #$invoiceNumber"
                    ];
                }
                
                // COGS (Debit) and Inventory (Credit)
                if ($totalCost > 0) {
                    $invoiceEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['cost_of_goods_sold'],
                        'entry_type' => 'DEBIT',
                        'amount' => $totalCost,
                        'description' => "Cost of Goods Sold - Invoice #$invoiceNumber"
                    ];
    
                    $invoiceEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['inventory'],
                        'entry_type' => 'CREDIT',
                        'amount' => $totalCost,
                        'description' => "Inventory usage - Invoice #$invoiceNumber"
                    ];
                }

                // Post Invoice GL
                $this->ledgerService->postTransaction(
                    $invoiceEntries,
                    'invoices',
                    $invoice->id,
                    null,
                    now()->format('Y-m-d')
                );

                // --- Transaction 2: The Payment (Prepayment) ---
                if ($amountPaid > 0) {
                    $paymentEntries = [];
                    // Dr Cash
                    $paymentEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['cash'],
                        'entry_type' => 'DEBIT',
                        'amount' => $amountPaid,
                        'description' => "Payment Received - Invoice #$invoiceNumber"
                    ];
                    // Cr AR
                    $paymentEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['accounts_receivable'],
                        'entry_type' => 'CREDIT',
                        'amount' => $amountPaid,
                        'description' => "Payment Applied - Invoice #$invoiceNumber"
                    ];

                    $this->ledgerService->postTransaction(
                        $paymentEntries,
                        'invoices',
                        $invoice->id,
                        null,
                        now()->format('Y-m-d')
                    );
                }

            } else {
                // Cash Sales (Standard single voucher behavior)
                $glEntries = [];

                // Revenue (Credit)
                $glEntries[] = [
                    'account_code' => $this->coaService->getStandardAccounts()['sales_revenue'],
                    'entry_type' => 'CREDIT',
                    'amount' => $subtotal,
                    'description' => "Sales Revenue - Invoice #$invoiceNumber"
                ];

                // VAT Payable (Credit)
                if ($vatAmount > 0) {
                    $glEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['output_vat'],
                        'entry_type' => 'CREDIT',
                        'amount' => $vatAmount,
                        'description' => "VAT Output - Invoice #$invoiceNumber"
                    ];
                }

                // Government Fees (Credit)
                foreach ($calculatedFees as $calcFee) {
                    if ($calcFee['account_code']) {
                         $glEntries[] = [
                            'account_code' => $calcFee['account_code'],
                            'entry_type' => 'CREDIT',
                            'amount' => $calcFee['amount'],
                            'description' => "Fee: {$calcFee['fee_name']} - Invoice #$invoiceNumber"
                        ];
                    }
                }

                // Debit Side (Cash + AR)
                if ($amountPaid > 0) {
                    $glEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['cash'],
                        'entry_type' => 'DEBIT',
                        'amount' => $amountPaid,
                        'description' => "Cash Received - Invoice #$invoiceNumber"
                    ];
                }

                $amountDue = $totalAmount - $amountPaid;
                if ($amountDue > 0.01) {
                    $glEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['accounts_receivable'],
                        'entry_type' => 'DEBIT',
                        'amount' => $amountDue,
                        'description' => "Accounts Receivable - Invoice #$invoiceNumber"
                    ];
                }

                // COGS (Debit) and Inventory (Credit)
                if ($totalCost > 0) {
                    $glEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['cost_of_goods_sold'],
                        'entry_type' => 'DEBIT',
                        'amount' => $totalCost,
                        'description' => "Cost of Goods Sold - Invoice #$invoiceNumber"
                    ];

                    $glEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['inventory'],
                        'entry_type' => 'CREDIT',
                        'amount' => $totalCost,
                        'description' => "Inventory usage - Invoice #$invoiceNumber"
                    ];
                }

                // Sales Discount (Debit)
                if ($discountAmount > 0) {
                    $glEntries[] = [
                        'account_code' => $this->coaService->getStandardAccounts()['sales_discount'],
                        'entry_type' => 'DEBIT',
                        'amount' => $discountAmount,
                        'description' => "Sales Discount - Invoice #$invoiceNumber"
                    ];
                }

                // Post GL
                $this->ledgerService->postTransaction(
                    $glEntries,
                    'invoices',
                    $invoice->id,
                    null,
                    now()->format('Y-m-d')
                );
            }

            return $invoice->id;
        });
    }

    public function deleteInvoice(int $invoiceId): void
    {
        DB::transaction(function () use ($invoiceId) {
            $invoice = Invoice::with('items')->findOrFail($invoiceId);

            // Fix BUG-002: Prevent deletion of paid invoices
            if ($invoice->amount_paid > 0) {
                throw new \Exception("Cannot delete an invoice that has payments collected. Please use the Credit Note/Void workflow instead.");
            }

            // Also check for any AR Transactions linked to this invoice that are NOT the invoice itself (e.g. payments)
            // Although standard flow puts payments on Customer, not directly linked to invoice ID in ArTransaction unless allocated.
            // But amount_paid > 0 is the primary flag for "Money touched hands".

            // 1. Identify associated Journal Entry
            $glEntry = GeneralLedger::where('reference_type', 'invoices')
                ->where('reference_id', $invoiceId)
                ->first();

            if ($glEntry) {
                // 2. Reverse Transaction
                $this->ledgerService->reverseTransaction(
                    $glEntry->voucher_number, 
                    "Reversal for deleted Invoice #{$invoice->invoice_number}"
                );
            }

            // Return stock
            foreach ($invoice->items as $item) {
                Product::where('id', $item->product_id)
                    ->increment('stock_quantity', $item->quantity);
            }

            // Reverse AR if credit
            if ($invoice->payment_type === 'credit' && $invoice->customer_id) {
                $netDue = $invoice->total_amount - $invoice->amount_paid;
                if ($netDue > 0) {
                    ArCustomer::where('id', $invoice->customer_id)
                        ->decrement('current_balance', $netDue);

                    ArTransaction::where('reference_type', 'invoices')
                        ->where('reference_id', $invoiceId)
                        ->update([
                            'is_deleted' => true,
                            'deleted_at' => now(),
                        ]);
                }
            }

            // Delete invoice items and invoice
            $invoice->items()->delete();
            $invoice->delete();
        });
    }
}
