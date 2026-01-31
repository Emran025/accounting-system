<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\Purchase;
use App\Models\Product;
use App\Models\ApSupplier;
use App\Models\User;
use App\Models\GeneralLedger;
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
        $product = Product::factory()->create(['stock_quantity' => 0]);

        $data = [
            'product_id' => $product->id,
            'quantity' => 10,
            'invoice_price' => 1150.00, // 1000 + 150 VAT
            'unit_type' => 'main',
            'supplier_id' => $supplier->id,
            'payment_type' => 'credit',
            'vat_rate' => 15,
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
        $product = Product::factory()->create();
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
        $product = Product::factory()->create(['stock_quantity' => 0]);
        $supplier = ApSupplier::factory()->create();

        // Set high threshold
        \App\Models\Setting::create([
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
            'vat_rate' => 15,
        ];

        $purchase = $this->purchaseService->createPurchase($data, $user->id);

        $this->assertEquals('approved', $purchase->approval_status);
        
        // Assert Stock Updated
        $this->assertEquals(1, $product->fresh()->stock_quantity);
        
        // Assert GL Entries
        $this->assertDatabaseHas('general_ledgers', [
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
        $product = Product::factory()->create(['stock_quantity' => 0]);
        $purchase = Purchase::factory()->create([
            'product_id' => $product->id,
            'quantity' => 10,
            'approval_status' => 'pending',
            'invoice_price' => 1150.00,
            'payment_type' => 'credit'
        ]);

        $result = $this->purchaseService->approvePurchase($purchase->id, $user->id);

        $this->assertTrue($result);
        $this->assertEquals('approved', $purchase->fresh()->approval_status);
        $this->assertEquals(10, $product->fresh()->stock_quantity);
        
        // AP Transaction created on approval
        $this->assertDatabaseHas('ap_transactions', [
            'reference_id' => $purchase->id,
            'supplier_id' => $purchase->supplier_id
        ]);
    }

    public function test_reverse_purchase_full()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 10]);
        $purchase = Purchase::factory()->create([
            'product_id' => $product->id,
            'quantity' => 10,
            'approval_status' => 'approved',
            'invoice_price' => 1150.00,
            'payment_type' => 'credit'
        ]);

        // Simulate initial GL posting
        $voucher = $purchase->voucher_number;
        // We need real GL entries for reversal to work if logic depends on them
        // Post manually or call processPurchaseImpact? 
        // Better call createPurchase -> approve -> reverse to simulate full lifecycle
        
        // Let's rely on standard logic: reversal decrements stock
        
        // But reversal checks 'is_reversed'
        $this->purchaseService->reversePurchase($purchase->id, $user->id);

        $this->assertTrue($purchase->fresh()->is_reversed);
        $this->assertEquals(0, $product->fresh()->stock_quantity);
    }

    public function test_reverse_purchase_partial_depletion_logic()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['stock_quantity' => 5]); // Only 5 left
        $purchase = Purchase::factory()->create([
            'product_id' => $product->id,
            'quantity' => 10, // Bought 10
            'approval_status' => 'approved',
            'invoice_price' => 1150.00,
            'payment_type' => 'credit'
        ]);

        $this->purchaseService->reversePurchase($purchase->id, $user->id);

        $this->assertTrue($purchase->fresh()->is_reversed);
        $this->assertEquals(0, $product->fresh()->stock_quantity); // 5 reversed
        $this->assertStringContainsString('Partially Reversed', $purchase->fresh()->notes);
    }
}
