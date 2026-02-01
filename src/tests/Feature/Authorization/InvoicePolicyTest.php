<?php

namespace Tests\Feature\Authorization;

use Tests\TestCase;
use App\Models\User;
use App\Models\Invoice;
use App\Models\FiscalPeriod;
use App\Models\Role;
use App\Policies\InvoicePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Test InvoicePolicy authorization rules
 */
class InvoicePolicyTest extends TestCase
{
    use RefreshDatabase;

    private InvoicePolicy $policy;
    private User $owner;
    private User $otherUser;
    private User $adminUser;
    private Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new InvoicePolicy();

        // Create roles
        $salesRole = Role::factory()->create(['name' => 'Sales']);
        $adminRole = Role::factory()->create(['name' => 'Admin']);

        // Create users
        $this->owner = User::factory()->create();
        $this->owner->roles()->attach($salesRole);
        
        $this->otherUser = User::factory()->create();
        $this->otherUser->roles()->attach($salesRole);
        
        $this->adminUser = User::factory()->create();
        $this->adminUser->roles()->attach($adminRole);

        // Create invoice owned by owner
        $this->invoice = Invoice::factory()->create([
            'user_id' => $this->owner->id,
            'amount_paid' => 0,
        ]);
    }

    /**
     * Test that owner can view their own invoice
     */
    public function test_owner_can_view_own_invoice(): void
    {
        // Owner should be able to view their own invoice even without view_all permission
        $this->assertTrue($this->policy->view($this->owner, $this->invoice));
    }

    /**
     * Test that other users cannot view invoices they don't own
     */
    public function test_other_user_cannot_view_others_invoice(): void
    {
        // Other user should not be able to view invoice they don't own
        $this->assertFalse($this->policy->view($this->otherUser, $this->invoice));
    }

    /**
     * Test that user with view_all permission can view any invoice
     */
    public function test_user_with_view_all_can_view_any_invoice(): void
    {
        // Grant view_all permission via role
        $permission = \App\Models\Module::firstOrCreate(['module_key' => 'sales']);
        $this->adminUser->roles()->first()->permissions()->create([
            'module_id' => $permission->id,
            'can_view' => true,
        ]);
        
        $this->assertTrue($this->policy->view($this->adminUser, $this->invoice));
    }

    /**
     * Test that invoice with payments cannot be deleted
     */
    public function test_cannot_delete_invoice_with_payments(): void
    {
        $invoiceWithPayment = Invoice::factory()->create([
            'user_id' => $this->owner->id,
            'amount_paid' => 100.00,
        ]);

        // Even with delete permission, cannot delete invoice with payments
        $this->assertFalse($this->policy->delete($this->owner, $invoiceWithPayment));
    }

    /**
     * Test that invoice in closed fiscal period cannot be deleted
     */
    public function test_cannot_delete_invoice_in_closed_period(): void
    {
        $period = FiscalPeriod::factory()->create([
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_closed' => true,
            'is_locked' => true,
        ]);

        $invoice = Invoice::factory()->create([
            'user_id' => $this->owner->id,
            'amount_paid' => 0,
        ]);

        // Associate invoice with period via GL entry
        \App\Models\GeneralLedger::factory()->create([
            'reference_type' => 'invoices',
            'reference_id' => $invoice->id,
            'fiscal_period_id' => $period->id,
        ]);

        // Cannot delete even with permission if period is closed
        $this->assertFalse($this->policy->delete($this->owner, $invoice));
    }

    /**
     * Test that owner can delete their own invoice if conditions are met
     */
    public function test_owner_can_delete_own_invoice_when_allowed(): void
    {
        $invoice = Invoice::factory()->create([
            'user_id' => $this->owner->id,
            'amount_paid' => 0,
        ]);

        // Owner should be able to delete their own invoice if no payments and period not closed
        $this->assertTrue($this->policy->delete($this->owner, $invoice));
    }
}

