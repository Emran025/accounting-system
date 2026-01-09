<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\Product;
use App\Models\ApSupplier;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PurchaseService
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

    /**
     * Create a new purchase record
     */
    public function createPurchase(array $data, int $userId): Purchase
    {
        return DB::transaction(function () use ($data, $userId) {
            $product = Product::findOrFail($data['product_id']);
            $itemsPerUnit = $product->items_per_unit ?? 1;
            
            $isPackage = ($data['unit_type'] === 'main' || $data['unit_type'] === 'package');
            $actualQuantity = $isPackage 
                ? ($data['quantity'] * $itemsPerUnit) 
                : $data['quantity'];

            // Fix BUG-005: Enforce Server Sovereignty for VAT Rate
            // Config stores VAT as decimal (0.15 = 15%), clients may send as percentage (15)
            // Always use server config as the authoritative source
            $serverVatRateDecimal = (float)config('accounting.vat_rate', 0.15); // Decimal form
            $serverVatRatePercent = $serverVatRateDecimal * 100; // Percentage form for comparison
            
            if (isset($data['vat_rate'])) {
                // Client provided a VAT rate - validate it matches server config
                $clientVatRate = (float)$data['vat_rate'];
                
                // Check if client sent percentage (15) or decimal (0.15)
                $clientAsPercent = $clientVatRate > 1 ? $clientVatRate : $clientVatRate * 100;
                
                if (abs($clientAsPercent - $serverVatRatePercent) > 0.01) {
                    // Client is attempting to manipulate VAT rate - reject
                    throw new \Exception(
                        "VAT rate mismatch: Submitted rate ({$clientAsPercent}%) " .
                        "does not match system configuration ({$serverVatRatePercent}%). " .
                        "Please refresh and try again."
                    );
                }
            }
            
            // Always use server config (store as percentage for database consistency with existing code)
            $vatRate = $serverVatRatePercent;
            $vatRateDecimal = $serverVatRateDecimal;
            
            // Fix BUG-007: Calculate VAT from Gross Price
            $vatAmount = $data['vat_amount'] ?? ($data['invoice_price'] - ($data['invoice_price'] / (1 + $vatRateDecimal)));
            $subtotal = $data['invoice_price'] - $vatAmount;

            // Unit Cost should be based on Net Price (Subtotal) excluding recoverable VAT
            $unitCost = $subtotal / ($actualQuantity > 0 ? $actualQuantity : 1);

            // Determine approval status
            $approvalThreshold = (float) Setting::where('setting_key', 'purchase_approval_threshold')
                ->value('setting_value') ?? 10000;
            $approvalStatus = $data['invoice_price'] >= $approvalThreshold ? 'pending' : 'approved';

            // Handle Supplier
            $supplierId = $data['supplier_id'] ?? null;
            if (!$supplierId && !empty($data['supplier_name'])) {
                $supplierName = trim($data['supplier_name']);
                if (strlen($supplierName) >= 2) {
                    $supplier = ApSupplier::firstOrCreate(
                        ['name' => $supplierName],
                        ['created_by' => $userId]
                    );
                    $supplierId = $supplier->id;
                }
            }

            $paymentType = $data['payment_type'] ?? ($supplierId ? 'credit' : 'cash');
            
            // Critical Fix (BUG-001): Prevent Credit Purchase without Supplier
            if ($paymentType === 'credit' && !$supplierId) {
                // If the user explicitly requested credit but we couldn't resolve a supplier, we must fail.
                throw new \Exception("Credit purchases require a valid Supplier. Please select or enter a supplier.");
            }

            $purchase = Purchase::create([
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'invoice_price' => $data['invoice_price'],
                'unit_type' => $data['unit_type'], // We keep original unit_type string ('package' or 'main') for display
                'production_date' => $data['production_date'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'supplier_id' => $supplierId,
                'payment_type' => $paymentType,
                'vat_rate' => $vatRate,
                'vat_amount' => $vatAmount,
                'user_id' => $userId,
                'approval_status' => $approvalStatus,
                'voucher_number' => $this->ledgerService->getNextVoucherNumber('PUR'),
                'notes' => $data['notes'] ?? null,
            ]);

            if ($approvalStatus === 'approved') {
                $this->processPurchaseImpact($purchase, $actualQuantity, $unitCost, $subtotal);
                
                // Fix BUG-001: Ensure AP Transaction is created for auto-approved credit purchases
                if ($paymentType === 'credit' && $supplierId) {
                    $this->recordApTransaction($purchase, $userId);
                }
            }

            return $purchase;
        });
    }

    /**
     * Process stock and financial impact of a purchase
     */
    public function processPurchaseImpact(Purchase $purchase, int $actualQuantity, float $unitCost, float $subtotal): void
    {
        // Update stock
        $purchase->product->increment('stock_quantity', $actualQuantity);

        // Record in inventory costing
        $this->costingService->recordPurchase(
            $purchase->product_id, 
            $purchase->id, 
            $actualQuantity, 
            $unitCost, 
            $purchase->invoice_price, 
            config('accounting.inventory.costing_method', 'FIFO')
        );

        // Update weighted average cost
        $this->updateProductWAC($purchase->product, $actualQuantity, $purchase->invoice_price);

        // Post to GL
        $this->postPurchaseToGL($purchase, $subtotal);
    }

    /**
     * Update Weighted Average Cost for a product
     */
    private function updateProductWAC(Product $product, int $newQty, float $newTotalCost): void
    {
        $currentStock = $product->stock_quantity;
        $currentWac = $product->weighted_average_cost ?? 0;
        $oldStock = $currentStock - $newQty;
        
        $newWac = 0;
        if ($currentStock > 0) {
            $newWac = (($oldStock * $currentWac) + $newTotalCost) / $currentStock;
        }
        
        $product->update(['weighted_average_cost' => $newWac]);
    }

    /**
     * Post purchase transaction to General Ledger
     */
    private function postPurchaseToGL(Purchase $purchase, float $subtotal): void
    {
        $accounts = $this->coaService->getStandardAccounts();
        $glEntries = [
            [
                'account_code' => $accounts['inventory'],
                'entry_type' => 'DEBIT',
                'amount' => $subtotal,
                'description' => "Purchase - Voucher #{$purchase->voucher_number}"
            ],
        ];

        if ($purchase->vat_amount > 0) {
            $glEntries[] = [
                'account_code' => $accounts['input_vat'],
                'entry_type' => 'DEBIT',
                'amount' => $purchase->vat_amount,
                'description' => "VAT Input - Voucher #{$purchase->voucher_number}"
            ];
        }

        // Credit side (based on payment_type)
        $isCredit = $purchase->payment_type === 'credit' && $purchase->supplier_id;
        $paymentAccount = $isCredit ? $accounts['accounts_payable'] : $accounts['cash'];
        
        $glEntries[] = [
            'account_code' => $paymentAccount,
            'entry_type' => 'CREDIT',
            'amount' => $purchase->invoice_price,
            'description' => "Purchase Payment - Voucher #{$purchase->voucher_number}"
        ];

        $this->ledgerService->postTransaction(
            $glEntries,
            'purchases',
            $purchase->id,
            $purchase->voucher_number,
            now()->format('Y-m-d')
        );
    }

    /**
     * Approve a pending purchase
     */
    public function approvePurchase(int $purchaseId, int $userId): bool
    {
        return DB::transaction(function () use ($purchaseId, $userId) {
            $purchase = Purchase::findOrFail($purchaseId);

            if ($purchase->approval_status === 'approved') {
                return false;
            }

            $purchase->update([
                'approval_status' => 'approved',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            $product = $purchase->product;
            $itemsPerUnit = $product->items_per_unit ?? 1;
            $isPackage = ($purchase->unit_type === 'main' || $purchase->unit_type === 'package');
            $actualQuantity = $isPackage
                ? ($purchase->quantity * $itemsPerUnit) 
                : $purchase->quantity;

            $unitCost = $purchase->invoice_price / ($actualQuantity > 0 ? $actualQuantity : 1);
            $subtotal = $purchase->invoice_price - $purchase->vat_amount;

            $this->processPurchaseImpact($purchase, $actualQuantity, $unitCost, $subtotal);

            // If credit purchase, create AP transaction
            if ($purchase->supplier_id && $purchase->payment_type === 'credit') {
                $this->recordApTransaction($purchase, $userId);
            }

            return true;
        });
    }

    /**
     * Update supplier balance based on transactions
     */
    public function updateSupplierBalance(int $supplierId): void
    {
        $balance = DB::table('ap_transactions')
            ->where('supplier_id', $supplierId)
            ->where('is_deleted', 0)
            ->sum(DB::raw("CASE 
                WHEN type = 'invoice' THEN amount 
                WHEN type IN ('payment', 'return') THEN -amount 
                ELSE 0 
            END"));
        
        ApSupplier::where('id', $supplierId)->update(['current_balance' => $balance]);
    }

    /**
     * Reverse a purchase (Soft delete/Reversal)
     */
    public function reversePurchase(int $purchaseId, int $userId): void
    {
        DB::transaction(function () use ($purchaseId, $userId) {
            $purchase = Purchase::findOrFail($purchaseId);

            if ($purchase->is_reversed) {
                throw new \Exception('Purchase is already reversed');
            }

            $purchase->update([
                'is_reversed' => true,
                'reversed_at' => now(),
                'reversed_by' => $userId,
            ]);

            if ($purchase->approval_status === 'approved') {
                $product = $purchase->product;
                $isPackage = ($purchase->unit_type === 'main' || $purchase->unit_type === 'package');
                $actualQty = $isPackage 
                    ? ($purchase->quantity * ($product->items_per_unit ?? 1)) 
                    : $purchase->quantity;
                
                // Fix BUG-006: Liberate Operations - Partial Reversal Logic
                // Instead of blocking the reversal if some stock is sold, we reverse what is remaining.
                $availableStock = $product->stock_quantity;
                $qtyToReverse = $actualQty;
                
                if ($availableStock < $actualQty) {
                    // Partial Reversal
                    $qtyToReverse = $availableStock;
                    
                    // Log or Note the partial nature
                    $purchase->update([
                         'notes' => ($purchase->notes ?? '') . " [System: Partially Reversed ($qtyToReverse / $actualQty) due to depletion]",
                    ]);
                }
                
                if ($qtyToReverse > 0) {
                     $product->decrement('stock_quantity', $qtyToReverse);
                } else {
                     throw new \Exception("Cannot reverse purchase: Stock is fully depleted.");
                }

                // BUG-006: Handle Partial GL/AP Reversal
                $ratio = $actualQty > 0 ? ($qtyToReverse / $actualQty) : 1;
                
                if ($purchase->voucher_number) {
                     if ($ratio >= 0.999) {
                          $this->ledgerService->reverseTransaction($purchase->voucher_number, "Reversal of Purchase #" . $purchase->voucher_number);
                     } else {
                          // Partial GL Reversal
                          $entries = \App\Models\GeneralLedger::where('voucher_number', $purchase->voucher_number)->with('account')->get();
                          $reversalEntries = [];
                          foreach ($entries as $entry) {
                               $reversedType = $entry->entry_type === 'DEBIT' ? 'CREDIT' : 'DEBIT';
                               $partialAmount = round($entry->amount * $ratio, 2);
                               if ($partialAmount > 0) {
                                   $reversalEntries[] = [
                                       'account_code' => $entry->account->account_code,
                                       'entry_type' => $reversedType,
                                       'amount' => $partialAmount,
                                       'description' => "Partial Reversal ($qtyToReverse/$actualQty) - Purchase #{$purchase->voucher_number}"
                                   ];
                               }
                          }
                          if (!empty($reversalEntries)) {
                               $this->ledgerService->postTransaction($reversalEntries, 'purchases', $purchase->id, null, now()->format('Y-m-d'));
                          }
                     }
                }

                if ($purchase->supplier_id) {
                    if ($ratio >= 0.999) {
                        DB::table('ap_transactions')
                            ->where('reference_type', 'purchases')
                            ->where('reference_id', $purchase->id)
                            ->update(['is_deleted' => true]);
                    } else {
                        // Partial Return Logic
                        $reversedAmount = round($purchase->invoice_price * $ratio, 2);
                         if ($reversedAmount > 0) {
                            \App\Models\ApTransaction::create([
                                'supplier_id' => $purchase->supplier_id,
                                'type' => 'return',
                                'amount' => $reversedAmount,
                                'description' => "Partial Return ($qtyToReverse/$actualQty) - Purchase #{$purchase->voucher_number}",
                                'reference_type' => 'purchases',
                                'reference_id' => $purchase->id,
                                'created_by' => $userId,
                                'transaction_date' => now(),
                            ]);
                        }
                    }
                    $this->updateSupplierBalance($purchase->supplier_id);
                }
            }


        });
    }
    /**
     * Record Account Payable Transaction
     */
    private function recordApTransaction(Purchase $purchase, int $userId): void
    {
        // Check if transaction already exists to avoid duplicates
        $exists = DB::table('ap_transactions')
            ->where('reference_type', 'purchases')
            ->where('reference_id', $purchase->id)
            ->where('is_deleted', 0)
            ->exists();

        if ($exists) {
            return;
        }

        \App\Models\ApTransaction::create([
            'supplier_id' => $purchase->supplier_id,
            'type' => 'invoice',
            'amount' => $purchase->invoice_price,
            'description' => "Purchase Invoice #" . $purchase->voucher_number,
            'reference_type' => 'purchases',
            'reference_id' => $purchase->id,
            'created_by' => $userId,
            'transaction_date' => now(),
        ]);

        $this->updateSupplierBalance($purchase->supplier_id);
    }
}
