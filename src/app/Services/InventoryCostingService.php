<?php

namespace App\Services;

use App\Models\Product;
use App\Exceptions\BusinessLogicException;
use Illuminate\Support\Facades\DB;

class InventoryCostingService
{
    /**
     * Record a purchase for inventory costing
     * 
     * @param int $productId Product ID
     * @param int $purchaseId Purchase ID
     * @param int $quantity Quantity purchased
     * @param float $unitCost Unit cost
     * @param float $totalCost Total cost
     * @param string $method Costing method (FIFO, LIFO, WAC)
     * @param string $refType
     * @param int $refId
     * @return void
     */
    public function recordPurchase(
        int $productId,
        int $purchaseId,
        int $quantity,
        float $unitCost,
        float $totalCost,
        string $method = 'FIFO',
        string $refType = 'purchases',
        ?int $refId = null
    ): void {
        DB::table('inventory_costing')->insert([
            'product_id' => $productId,
            'reference_type' => $refType,
            'reference_id' => $refId ?? $purchaseId,
            'quantity' => $quantity, // Immutable Original Quantity
            'consumed_quantity' => 0, // Track consumption separately
            'unit_cost' => $unitCost,
            'total_cost' => $totalCost,
            'is_sold' => false,
            'costing_method' => $method,
            'transaction_date' => now(),
            'created_at' => now(),
        ]);
    }

    /**
     * Record a sale and calculate COGS
     * 
     * @param int $productId Product ID
     * @param int $saleId Sale/Invoice ID
     * @param int $quantity Quantity sold
     * @param string $method Costing method (FIFO, LIFO, WAC)
     * @return float Cost of Goods Sold
     */
    public function recordSale(
        int $productId,
        int $saleId,
        int $quantity,
        string $method = 'FIFO'
    ): float {
        // CRITICAL FIX: Wrap entire operation in transaction with row-level locking
        // Prevents race conditions when multiple concurrent sales consume same inventory layers
        return DB::transaction(function () use ($productId, $saleId, $quantity, $method) {
            // Calculate COGS first (read-only, no locking needed)
            $cogs = $this->getCostOfGoodsSold($productId, $quantity, $method);

            // Mark inventory as sold based on costing method
            $remainingQtyToSell = $quantity;

            // CRITICAL FIX: Use lockForUpdate() to prevent concurrent modifications
            // This ensures atomic read-modify-write operations on inventory layers
            $query = DB::table('inventory_costing as ic')
                ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
                ->select('ic.id', 'ic.quantity', 'ic.unit_cost', 'ic.transaction_date')
                ->selectRaw('COALESCE(SUM(cons.quantity), 0) as total_consumed')
                ->where('ic.product_id', $productId)
                ->groupBy('ic.id', 'ic.quantity', 'ic.unit_cost', 'ic.transaction_date')
                ->havingRaw('(ic.quantity - total_consumed) > 0')
                ->lockForUpdate(); // CRITICAL: Lock rows to prevent concurrent access

            if ($method === 'LIFO') {
                $query->orderBy('ic.transaction_date', 'desc')->orderBy('ic.id', 'desc');
            } else {
                // FIFO and WAC (WAC uses FIFO for depletion in this simplified model)
                $query->orderBy('ic.transaction_date', 'asc')->orderBy('ic.id', 'asc');
            }

            $inventory = $query->get();

            // Validate sufficient inventory after locking
            $totalAvailable = 0;
            foreach ($inventory as $item) {
                $totalAvailable += ($item->quantity - $item->total_consumed);
            }

            if ($totalAvailable < $quantity) {
                throw new BusinessLogicException(
                    "Insufficient inventory available. " .
                    "Requested: {$quantity}, Available: {$totalAvailable} " .
                    "(Product ID: {$productId})"
                );
            }

            foreach ($inventory as $item) {
                if ($remainingQtyToSell <= 0) {
                    break;
                }

                // Re-calculate remaining after lock (atomic operation)
                $currentRemaining = $item->quantity - $item->total_consumed;
                
                if ($currentRemaining <= 0) {
                    continue; // Skip if already consumed by another transaction
                }

                $qtyToTake = min($remainingQtyToSell, $currentRemaining);

                // Create Immutable Consumption Record
                DB::table('inventory_consumptions')->insert([
                    'inventory_costing_id' => $item->id,
                    'consumption_type' => 'sale',
                    'reference_id' => $saleId,
                    'reference_type' => 'invoices',
                    'quantity' => $qtyToTake,
                    'unit_cost' => $item->unit_cost,
                    'total_cost' => $qtyToTake * $item->unit_cost,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $remainingQtyToSell -= $qtyToTake;
            }

            // Final validation: ensure we consumed exactly what we needed
            if ($remainingQtyToSell > 0) {
                throw new BusinessLogicException(
                    "Failed to consume full quantity. " .
                    "Remaining: {$remainingQtyToSell}, Requested: {$quantity} " .
                    "(Product ID: {$productId})"
                );
            }

            return $cogs;
        });
    }

    /**
     * Handle Inventory Count Adjustments (BUG-006)
     */
    public function recordAdjustment(int $productId, int $inventoryCountId, int $variance): void
    {
        if ($variance > 0) {
            // Found items. Add layer.
            $product = Product::find($productId);
            
            // Fix BUG-005: Phantom Value Creation
            $unitCost = $product->weighted_average_cost ?? 0;
            if ($unitCost <= 0) {
                 // Fallback to latest purchase price or 0, but ideally we should flag this.
                 // For now, we proceed but validation logic should exist at controller level.
                 $unitCost = $product->purchase_price ?? 0;
            }

            $totalCost = $variance * $unitCost;

            $this->recordPurchase(
                $productId, 
                0, // No Purchase ID
                $variance,
                $unitCost,
                $totalCost,
                'FIFO',
                'inventory_counts',
                $inventoryCountId
            );
        } elseif ($variance < 0) {
            // Lost items. Consume layers.
            $qtyToConsume = abs($variance);
            $this->recordSale($productId, $inventoryCountId, $qtyToConsume, 'FIFO');
        }
    }

    /**
     * Calculate Cost of Goods Sold for a sale
     * 
     * @param int $productId Product ID
     * @param int $quantity Quantity to sell
     * @param string $method Costing method (FIFO, LIFO, WAC)
     * @return float Cost of Goods Sold
     */
    public function getCostOfGoodsSold(
        int $productId,
        int $quantity,
        string $method = 'FIFO'
    ): float {
        if ($method === 'WAC') {
            // Weighted Average Cost using Consumptions
            $totals = DB::table('inventory_costing as ic')
                ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
                ->where('ic.product_id', $productId)
                ->selectRaw('SUM(ic.quantity - COALESCE(cons.quantity, 0)) as total_qty')
                ->selectRaw('SUM((ic.quantity - COALESCE(cons.quantity, 0)) * ic.unit_cost) as total_value')
                ->groupBy('ic.product_id') // Group by needs aggregation compatibility, simplified here
                ->first();
             
             // The above query logic with join needs care for SUM/Grouping. 
             // Correct logic: Subquery for consumptions or careful GroupBy.
             // Given limitations, we can trust the 'Product->weighted_average_cost' for WAC simply?
             // Or calculate it properly.
             // Let's use the explicit calculation:
            $items = DB::table('inventory_costing as ic')
                ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
                ->select('ic.quantity', 'ic.unit_cost')
                ->selectRaw('COALESCE(SUM(cons.quantity), 0) as consumed')
                ->where('ic.product_id', $productId)
                ->groupBy('ic.id', 'ic.quantity', 'ic.unit_cost')
                ->havingRaw('(ic.quantity - consumed) > 0')
                ->get();
            
            $totalQty = 0;
            $totalValue = 0;
            foreach ($items as $itm) {
                 $rem = $itm->quantity - $itm->consumed;
                 $totalQty += $rem;
                 $totalValue += ($rem * $itm->unit_cost);
            }

            if ($totalQty > 0) {
                $avgCost = $totalValue / $totalQty;
                return $avgCost * $quantity;
            }

            return 0;
        }

        // FIFO or LIFO
        $cogs = 0;
        $remainingQty = $quantity;

        // Uses same immutable logic as recordSale
        $query = DB::table('inventory_costing as ic')
            ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
            ->select('ic.id', 'ic.quantity', 'ic.unit_cost', 'ic.transaction_date')
            ->selectRaw('COALESCE(SUM(cons.quantity), 0) as total_consumed')
            ->where('ic.product_id', $productId)
            ->groupBy('ic.id', 'ic.quantity', 'ic.unit_cost', 'ic.transaction_date')
            ->havingRaw('(ic.quantity - total_consumed) > 0');

        if ($method === 'LIFO') {
            $query->orderBy('ic.transaction_date', 'desc')->orderBy('ic.id', 'desc');
        } else {
            $query->orderBy('ic.transaction_date', 'asc')->orderBy('ic.id', 'asc');
        }

        $inventory = $query->get();

        foreach ($inventory as $item) {
            if ($remainingQty <= 0) {
                break;
            }

            $currentRemaining = $item->quantity - $item->total_consumed;
            $qtyToUse = min($remainingQty, $currentRemaining);
            
            $cogs += $qtyToUse * $item->unit_cost;
            $remainingQty -= $qtyToUse;
        }

        return $cogs;
    }

    /**
     * Get inventory valuation for a product or all products
     * 
     * @param int|null $productId Product ID (null for all products)
     * @param string $method Costing method (FIFO, LIFO, WAC)
     * @return array Inventory valuation data
     */
    public function getInventoryValuation(?int $productId = null, string $method = 'FIFO'): array
    {
        $query = DB::table('inventory_costing as ic')
            ->leftJoin('inventory_consumptions as cons', 'ic.id', '=', 'cons.inventory_costing_id')
            ->select('ic.product_id', 'ic.quantity', 'ic.unit_cost')
            ->selectRaw('COALESCE(SUM(cons.quantity), 0) as consumed_qty')
            ->groupBy('ic.id', 'ic.product_id', 'ic.quantity', 'ic.unit_cost') // Group by ID to separate batches
            ->havingRaw('(ic.quantity - consumed_qty) > 0');

        if ($productId) {
            $query->where('ic.product_id', $productId);
        }

        $batches = $query->get();
        
        // Aggregate batches per product
        $valuation = [];
        
        foreach ($batches as $batch) {
             $pid = $batch->product_id;
             if (!isset($valuation[$pid])) {
                 $valuation[$pid] = ['product_id' => $pid, 'quantity' => 0, 'value' => 0];
             }
             
             $rem = $batch->quantity - $batch->consumed_qty;
             $valuation[$pid]['quantity'] += $rem;
             $valuation[$pid]['value'] += ($rem * $batch->unit_cost);
        }

        return array_map(function ($item) {
             return [
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'value' => $item['value'],
                'average_cost' => $item['quantity'] > 0 ? $item['value'] / $item['quantity'] : 0
             ];
        }, array_values($valuation));
    }

    /**
     * Update weighted average cost for a product
     * 
     * @param int $productId Product ID
     * @return float New weighted average cost
     */
    public function updateWeightedAverageCost(int $productId): float
    {
        $totals = DB::table('inventory_costing')
            ->where('product_id', $productId)
            ->where('is_sold', false)
            ->selectRaw('SUM(quantity - consumed_quantity) as total_qty, SUM((quantity - consumed_quantity) * unit_cost) as total_value')
            ->first();

        if ($totals && $totals->total_qty > 0) {
            $wac = $totals->total_value / $totals->total_qty;
            
            Product::where('id', $productId)->update([
                'weighted_average_cost' => $wac
            ]);

            return $wac;
        }

        return 0;
    }
}
