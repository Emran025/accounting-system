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
            
            $actualQuantity = ($data['unit_type'] === 'main') 
                ? ($data['quantity'] * $itemsPerUnit) 
                : $data['quantity'];

            $unitCost = $data['invoice_price'] / ($actualQuantity > 0 ? $actualQuantity : 1);
            $vatRate = $data['vat_rate'] ?? 0;
            $vatAmount = $data['vat_amount'] ?? ($data['invoice_price'] * $vatRate / 100);
            $subtotal = $data['invoice_price'] - $vatAmount;

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

            $purchase = Purchase::create([
                'product_id' => $data['product_id'],
                'quantity' => $data['quantity'],
                'invoice_price' => $data['invoice_price'],
                'unit_type' => $data['unit_type'],
                'production_date' => $data['production_date'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'supplier_id' => $supplierId,
                'vat_rate' => $vatRate,
                'vat_amount' => $vatAmount,
                'user_id' => $userId,
                'approval_status' => $approvalStatus,
                'voucher_number' => $this->ledgerService->getNextVoucherNumber('PUR'),
                'notes' => $data['notes'] ?? null,
            ]);

            if ($approvalStatus === 'approved') {
                $this->processPurchaseImpact($purchase, $actualQuantity, $unitCost, $subtotal);
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
            'FIFO'
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

        // Credit side (Assume Cash for now, can be extended based on payment_type)
        $paymentAccount = $purchase->supplier_id ? $accounts['accounts_payable'] : $accounts['cash'];
        
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
            $actualQuantity = ($purchase->unit_type === 'main') 
                ? ($purchase->quantity * $itemsPerUnit) 
                : $purchase->quantity;

            $unitCost = $purchase->invoice_price / ($actualQuantity > 0 ? $actualQuantity : 1);
            $subtotal = $purchase->invoice_price - $purchase->vat_amount;

            $this->processPurchaseImpact($purchase, $actualQuantity, $unitCost, $subtotal);

            // If credit purchase, create AP transaction
            if ($purchase->supplier_id) {
                DB::table('ap_transactions')->insert([
                    'supplier_id' => $purchase->supplier_id,
                    'type' => 'invoice',
                    'amount' => $purchase->invoice_price,
                    'description' => "Purchase Invoice #" . $purchase->voucher_number,
                    'reference_type' => 'purchases',
                    'reference_id' => $purchase->id,
                    'created_by' => $userId,
                    'created_at' => now(),
                ]);

                $this->updateSupplierBalance($purchase->supplier_id);
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
                $actualQty = ($purchase->unit_type === 'main') 
                    ? ($purchase->quantity * ($product->items_per_unit ?? 1)) 
                    : $purchase->quantity;
                
                $product->decrement('stock_quantity', $actualQty);
                // WAC reversal is complex and usually requires history recalculation; 
                // for standard accounting systems, we often just leave WAC as is or log the discrepancy.
            }

            if ($purchase->voucher_number) {
                $this->ledgerService->reverseTransaction($purchase->voucher_number, "Reversal of Purchase #" . $purchase->voucher_number);
            }

            if ($purchase->supplier_id) {
                DB::table('ap_transactions')
                    ->where('reference_type', 'purchases')
                    ->where('reference_id', $purchase->id)
                    ->update(['is_deleted' => true]);
                
                $this->updateSupplierBalance($purchase->supplier_id);
            }
        });
    }
}
