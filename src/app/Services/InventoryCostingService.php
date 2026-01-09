<?php

namespace App\Services;

use App\Models\Product;
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
     * @return void
     */
    public function recordPurchase(
        int $productId,
        int $purchaseId,
        int $quantity,
        float $unitCost,
        float $totalCost,
        string $method = 'FIFO'
    ): void {
        DB::table('inventory_costing')->insert([
            'product_id' => $productId,
            'reference_type' => 'purchases',
            'reference_id' => $purchaseId,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'total_cost' => $totalCost,
            'is_sold' => false,
            'costing_method' => $method,
            'transaction_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
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
        $cogs = $this->getCostOfGoodsSold($productId, $quantity, $method);

        // Mark inventory as sold based on costing method
        $remainingQty = $quantity;

        if ($method === 'FIFO') {
            // First In, First Out
            $inventory = DB::table('inventory_costing')
                ->where('product_id', $productId)
                ->where('is_sold', false)
                ->orderBy('transaction_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();
        } elseif ($method === 'LIFO') {
            // Last In, First Out
            $inventory = DB::table('inventory_costing')
                ->where('product_id', $productId)
                ->where('is_sold', false)
                ->orderBy('transaction_date', 'desc')
                ->orderBy('id', 'desc')
                ->get();
        } else {
            // Weighted Average Cost
            $inventory = DB::table('inventory_costing')
                ->where('product_id', $productId)
                ->where('is_sold', false)
                ->orderBy('transaction_date', 'asc')
                ->get();
        }

        foreach ($inventory as $item) {
            if ($remainingQty <= 0) {
                break;
            }

            $qtyToSell = min($remainingQty, $item->quantity);

            DB::table('inventory_costing')
                ->where('id', $item->id)
                ->update([
                    'quantity' => $item->quantity - $qtyToSell,
                    'is_sold' => ($item->quantity - $qtyToSell) == 0,
                    'updated_at' => now(),
                ]);

            $remainingQty -= $qtyToSell;
        }

        return $cogs;
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
            // Weighted Average Cost
            $totals = DB::table('inventory_costing')
                ->where('product_id', $productId)
                ->where('is_sold', false)
                ->selectRaw('SUM(quantity) as total_qty, SUM(total_cost) as total_cost')
                ->first();

            if ($totals && $totals->total_qty > 0) {
                $avgCost = $totals->total_cost / $totals->total_qty;
                return $avgCost * $quantity;
            }

            return 0;
        }

        // FIFO or LIFO
        $cogs = 0;
        $remainingQty = $quantity;

        if ($method === 'FIFO') {
            $inventory = DB::table('inventory_costing')
                ->where('product_id', $productId)
                ->where('is_sold', false)
                ->orderBy('transaction_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();
        } else {
            // LIFO
            $inventory = DB::table('inventory_costing')
                ->where('product_id', $productId)
                ->where('is_sold', false)
                ->orderBy('transaction_date', 'desc')
                ->orderBy('id', 'desc')
                ->get();
        }

        foreach ($inventory as $item) {
            if ($remainingQty <= 0) {
                break;
            }

            $qtyToUse = min($remainingQty, $item->quantity);
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
        $query = DB::table('inventory_costing')
            ->where('is_sold', false);

        if ($productId) {
            $query->where('product_id', $productId);
        }

        if ($method === 'WAC') {
            // Weighted Average Cost
            $valuation = $query
                ->selectRaw('product_id, SUM(quantity) as quantity, SUM(total_cost) as value')
                ->groupBy('product_id')
                ->get();

            return $valuation->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'value' => $item->value,
                    'average_cost' => $item->quantity > 0 ? $item->value / $item->quantity : 0,
                ];
            })->toArray();
        }

        // FIFO or LIFO
        $valuation = $query
            ->selectRaw('product_id, SUM(quantity) as quantity, SUM(quantity * unit_cost) as value')
            ->groupBy('product_id')
            ->get();

        return $valuation->map(function ($item) {
            return [
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'value' => $item->value,
                'average_cost' => $item->quantity > 0 ? $item->value / $item->quantity : 0,
            ];
        })->toArray();
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
            ->selectRaw('SUM(quantity) as total_qty, SUM(total_cost) as total_cost')
            ->first();

        if ($totals && $totals->total_qty > 0) {
            $wac = $totals->total_cost / $totals->total_qty;
            
            Product::where('id', $productId)->update([
                'weighted_average_cost' => $wac
            ]);

            return $wac;
        }

        return 0;
    }
}
