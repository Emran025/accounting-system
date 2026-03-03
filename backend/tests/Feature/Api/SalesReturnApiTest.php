<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\ArCustomer;
use App\Models\SalesReturn;
use App\Models\FiscalPeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class SalesReturnApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();

        FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);
    }

    public function test_can_list_sales_returns()
    {
        $response = $this->authGet(route('api.sales_returns.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data', 'pagination']);
    }

    public function test_can_create_sales_return()
    {
        $customer = ArCustomer::factory()->create();
        $invoice = Invoice::factory()->create([
            'customer_id' => $customer->id,
            'user_id' => $this->authenticatedUser->id,
            'payment_type' => 'cash',
        ]);
        $product = Product::factory()->create([
            'stock_quantity' => 10,
            'weighted_average_cost' => 50.00,
        ]);
        InvoiceItem::factory()->create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'quantity' => 5,
            'unit_price' => 100,
        ]);

        // Seed costing layer
        app(\App\Services\InventoryCostingService::class)->recordPurchase($product->id, 1, 10, 50.00, 500.00);

        $data = [
            'invoice_id' => $invoice->id,
            'return_date' => now()->toDateString(),
            'reason' => 'Defective product',
            'items' => [
                [
                    'invoice_item_id' => InvoiceItem::where('invoice_id', $invoice->id)->first()->id,
                    'return_quantity' => 2,
                    'reason' => 'Damaged',
                ],
            ],
        ];

        $response = $this->authPost(route('api.sales_returns.store'), $data);

        $this->assertSuccessResponse($response);
    }

    public function test_can_view_sales_return_details()
    {
        $customer = ArCustomer::factory()->create();
        $invoice = Invoice::factory()->create([
            'customer_id' => $customer->id,
            'user_id' => $this->authenticatedUser->id,
        ]);

        $return = SalesReturn::create([
            'invoice_id' => $invoice->id,
            'reason' => 'Test',
            'return_number' => 'RTN-TEST-001',
            'total_amount' => 100.00,
            'subtotal' => 100.00,
            'user_id' => $this->authenticatedUser->id,
        ]);

        $response = $this->authGet(route('api.sales_returns.show') . '?id=' . $return->id);

        $this->assertSuccessResponse($response);
    }

    public function test_can_view_sales_returns_ledger()
    {
        $response = $this->authGet(route('api.sales_returns.ledger'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data', 'pagination', 'stats']);
    }

    public function test_create_return_validates_required_fields()
    {
        $response = $this->authPost(route('api.sales_returns.store'), []);

        $response->assertStatus(422);
    }
}
