<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Purchase;
use App\Models\Product;
use App\Models\ApSupplier;
use App\Models\User;
use App\Models\GeneralLedger;
use App\Models\Setting;
use App\Models\ApTransaction;
use App\Services\PurchaseService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use App\Services\InventoryCostingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;

class PurchaseServiceTest extends TestCase
{
    use RefreshDatabase;

    private PurchaseService $purchaseService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Ensure standard accounts exist
        $this->seedChartOfAccounts();
        
        // Resolve service with real dependencies
        $this->purchaseService = app(PurchaseService::class);
    }

    public function test_create_purchase_success_credit()
    {
        $user = User::factory()->create();
        $supplier = ApSupplier::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 0, 'items_per_unit' => 1]);

        $data = [
            'product_id' => $product->id,
            'quantity' => 10,
            'invoice_price' => 1150.00, // 1000 + 150 VAT
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 0.15,
            'notes' => 'Test Purchase'
        ];

        Config::set('accounting.vat_rate', 0.15);

        $purchase = $this->purchaseService->createPurchase($data, $user->id);

        $this->assertInstanceOf(Purchase::class, $purchase);
        $this->assertEquals(1150.00, $purchase->invoice_price);
        $this->assertEquals('pending', $purchase->approval_status); // Assuming > threshold or default
        $this->assertEquals(150.00, $purchase->vat_amount);
    }

    public function test_create_purchase_fails_vat_mismatch()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['items_per_unit' => 1]);
        $supplier = ApSupplier::factory()->create();

        $data = [
            'product_id' => $product->id,
            'quantity' => 10,
            'invoice_price' => 1150.00,
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 10, // Mismatch with 15%
        ];

        Config::set('accounting.vat_rate', 0.15);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('VAT rate mismatch');

        $this->purchaseService->createPurchase($data, $user->id);
    }

    public function test_create_purchase_auto_approves_below_threshold()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 0, 'items_per_unit' => 1]);
        $supplier = ApSupplier::factory()->create();

        // Set high threshold
        Setting::create([
            'setting_key' => 'purchase_approval_threshold',
            'setting_value' => '5000'
        ]);

        $data = [
            'product_id' => $product->id,
            'quantity' => 1,
            'invoice_price' => 100.00,
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 0.15,
        ];

        $purchase = $this->purchaseService->createPurchase($data, $user->id);

        $this->assertEquals('approved', $purchase->approval_status);
        
        // Assert Stock Updated
        $this->assertEquals(1, $product->fresh()->stock_quantity);
        
        // Assert GL Entries
        // Assert GL Entries
        $this->assertDatabaseHas('general_ledger', [
            'reference_id' => $purchase->id,
            'reference_type' => 'purchases'
        ]);

        // Assert AP Transaction
        $this->assertDatabaseHas('ap_transactions', [
            'reference_id' => $purchase->id,
            'type' => 'invoice'
        ]);
    }

    public function test_approve_purchase()
    {
        $user = User::factory()->create();
        $supplier = ApSupplier::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 0, 'items_per_unit' => 1]);
        
        $data = [
            'product_id' => $product->id,
            'quantity' => 10,
            'invoice_price' => 1150.00,
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 0.15,
        ];

        // Create pending purchase via service
        $purchase = $this->purchaseService->createPurchase($data, $user->id);
        
        // Approve it
        $result = $this->purchaseService->approvePurchase($purchase->id, $user->id);

        $this->assertTrue($result);
        $this->assertEquals('approved', $purchase->fresh()->approval_status);
        $this->assertEquals(10, $product->fresh()->stock_quantity);
        
        // AP Transaction created on approval
        $this->assertDatabaseHas('ap_transactions', [
            'reference_id' => $purchase->id,
            'supplier_id' => $supplier->id
        ]);
    }

    public function test_reverse_purchase_full()
    {
        $user = User::factory()->create();
        $supplier = ApSupplier::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 0, 'items_per_unit' => 1]); // Start with 0
 
        $data = [
            'product_id' => $product->id,
            'quantity' => 10, // Buy 10
            'invoice_price' => 1150.00,
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 0.15,
        ];
        
        // Create steps to ensure GL entries exist
        $purchase = $this->purchaseService->createPurchase($data, $user->id);
        $this->purchaseService->approvePurchase($purchase->id, $user->id);
        
        // Now reverse
        $this->purchaseService->reversePurchase($purchase->id, $user->id);

        $this->assertTrue($purchase->fresh()->is_reversed);
        $this->assertEquals(0, $product->fresh()->stock_quantity);
    }

    public function test_reverse_purchase_partial_depletion_logic()
    {
        $user = User::factory()->create();
        $supplier = ApSupplier::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 0, 'items_per_unit' => 1]); // Start 0

        $data = [
            'product_id' => $product->id,
            'quantity' => 10,
            'invoice_price' => 1150.00,
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 15,
        ];

        $purchase = $this->purchaseService->createPurchase($data, $user->id);
        $this->purchaseService->approvePurchase($purchase->id, $user->id);

        // Manually consume 5 items (simulate sales) or just set stock to 5?
        // Service logic checks 'checkStockForReversal'.
        // If we set stock to 5 manually, it implies 5 were sold/consumed.
        $product->update(['stock_quantity' => 5]);

        $this->purchaseService->reversePurchase($purchase->id, $user->id);

        $this->assertTrue($purchase->fresh()->is_reversed);
        $this->assertEquals(0, $product->fresh()->stock_quantity); // 5 reversed, 0 left (should have been 0 if 5 sold, but we forced 5)
        // Check partial reversal logic if implemented in notes
        // Note: The original test checked for "Partially Reversed" in notes.
        // If implementation supports it.
         $this->assertStringContainsString('Partially Reversed', $purchase->fresh()->notes);
    }
}
