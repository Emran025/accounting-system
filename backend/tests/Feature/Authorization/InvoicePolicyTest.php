<?php

namespace Tests\Feature\Authorization;

use Tests\TestCase;
use App\Models\User;
use App\Models\Invoice;
use App\Models\FiscalPeriod;
use App\Models\GeneralLedger;
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
        $salesRole = Role::firstOrCreate(
            ['role_key' => 'sales'],
            [
                'role_name_en' => 'Sales',
                'role_name_ar' => 'Sales AR',
                'is_active' => true
            ]
        );
        
        $adminRole = Role::where('role_key', 'admin')->firstOrFail();

        // Create users
        $this->owner = User::factory()->create([
            'role_id' => $salesRole->id
        ]);
        
        $this->otherUser = User::factory()->create([
            'role_id' => $salesRole->id
        ]);
        
        $this->adminUser = User::factory()->create([
            'role_id' => $adminRole->id
        ]);

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
        $permission = \App\Models\Module::firstOrCreate(
            ['module_key' => 'sales'],
            [
                'module_name_ar' => 'المبيعات',
                'module_name_en' => 'Sales'
            ]
        );
        
        // Ensure role exists and attach permission
        $role = $this->adminUser->roleRelation;
        $role->permissions()->create([
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
        GeneralLedger::factory()->create([
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

        // Grant "sales.delete" permission to owner's role
        $role = $this->owner->roleRelation;
        $module = \App\Models\Module::firstOrCreate(
            ['module_key' => 'sales'],
            [
                'module_name_ar' => 'المبيعات',
                'module_name_en' => 'Sales'
            ]
        );
        $role->permissions()->create([
            'module_id' => $module->id,
            'can_delete' => true,
        ]);
        
        // Reload permissions into session for policy check (simulated)
        // Since policy checks $user->can(), we might need to refresh user or its permissions
        // But $user->can() uses Gate which uses PermissionService which loads from DB usually or session.
        // Let's assume standard Laravel Gate usage which queries DB or cache.
        // However, PermissionService::can relies on session('permissions').
        // We need to re-authenticate or re-load permissions.
        
        $this->authenticateUser($this->owner);

        // Owner should be able to delete their own invoice if no payments and period not closed
        $this->assertTrue($this->policy->delete($this->owner, $invoice));
    }
}

