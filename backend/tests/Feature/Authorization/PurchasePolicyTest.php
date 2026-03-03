<?php

namespace Tests\Feature\Authorization;

use Tests\TestCase;
use App\Models\User;
use App\Models\Purchase;
use App\Models\FiscalPeriod;
use App\Models\Role;
use App\Policies\PurchasePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PurchasePolicyTest extends TestCase
{
    use RefreshDatabase;

    private PurchasePolicy $policy;
    private User $owner;
    private User $otherUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new PurchasePolicy();

        $salesRole = Role::firstOrCreate(
            ['role_key' => 'sales'],
            [
                'role_name_en' => 'Sales',
                'role_name_ar' => 'مبيعات',
                'is_active' => true,
            ]
        );

        $this->owner = User::factory()->create(['role_id' => $salesRole->id]);
        $this->otherUser = User::factory()->create(['role_id' => $salesRole->id]);
    }

    public function test_owner_can_view_own_purchase()
    {
        $purchase = Purchase::factory()->create(['user_id' => $this->owner->id]);

        $this->assertTrue($this->policy->view($this->owner, $purchase));
    }

    public function test_other_user_cannot_view_others_purchase()
    {
        $purchase = Purchase::factory()->create(['user_id' => $this->owner->id]);

        $this->assertFalse($this->policy->view($this->otherUser, $purchase));
    }

    public function test_cannot_update_approved_and_reversed_purchase()
    {
        $purchase = Purchase::factory()->create([
            'user_id' => $this->owner->id,
            'approval_status' => 'approved',
            'is_reversed' => true,
        ]);

        $this->assertFalse($this->policy->update($this->owner, $purchase));
    }

    public function test_cannot_delete_approved_and_reversed_purchase()
    {
        $purchase = Purchase::factory()->create([
            'user_id' => $this->owner->id,
            'approval_status' => 'approved',
            'is_reversed' => true,
        ]);

        $this->assertFalse($this->policy->delete($this->owner, $purchase));
    }

    public function test_cannot_update_purchase_in_closed_period()
    {
        FiscalPeriod::factory()->create([
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_closed' => true,
            'is_locked' => true,
        ]);

        $purchase = Purchase::factory()->create([
            'user_id' => $this->owner->id,
            'purchase_date' => '2024-06-15',
            'approval_status' => 'pending',
            'is_reversed' => false,
        ]);

        $this->assertFalse($this->policy->update($this->owner, $purchase));
    }

    public function test_cannot_delete_purchase_in_locked_period()
    {
        FiscalPeriod::factory()->create([
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_closed' => false,
            'is_locked' => true,
        ]);

        $purchase = Purchase::factory()->create([
            'user_id' => $this->owner->id,
            'purchase_date' => '2024-06-15',
            'approval_status' => 'pending',
            'is_reversed' => false,
        ]);

        $this->assertFalse($this->policy->delete($this->owner, $purchase));
    }

    public function test_cannot_approve_already_approved_purchase()
    {
        $purchase = Purchase::factory()->create([
            'user_id' => $this->owner->id,
            'approval_status' => 'approved',
        ]);

        $this->assertFalse($this->policy->approve($this->owner, $purchase));
    }
}
