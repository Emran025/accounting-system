<?php

namespace Tests\Feature\Authorization;

use Tests\TestCase;
use App\Models\User;
use App\Models\JournalVoucher;
use App\Models\FiscalPeriod;
use App\Models\GeneralLedger;
use App\Policies\JournalVoucherPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;

/**
 * Test JournalVoucherPolicy authorization rules
 */
class JournalVoucherPolicyTest extends TestCase
{
    use RefreshDatabase;

    private JournalVoucherPolicy $policy;
    private User $owner;
    private User $otherUser;
    private JournalVoucher $voucher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->policy = new JournalVoucherPolicy();

        $this->owner = User::factory()->create();
        $this->otherUser = User::factory()->create();

        $this->voucher = JournalVoucher::factory()->create([
            'created_by' => $this->owner->id,
            'voucher_date' => now()->format('Y-m-d'),
            'voucher_number' => 'JV-001',
        ]);
    }

    /**
     * Test that owner can view their own voucher
     */
    public function test_owner_can_view_own_voucher(): void
    {
        // Owner should be able to view their own voucher
        $this->assertTrue($this->policy->view($this->owner, $this->voucher));
    }

    /**
     * Test that other users cannot view vouchers they don't own
     */
    public function test_other_user_cannot_view_others_voucher(): void
    {
        // Other user should not be able to view voucher they don't own
        $this->assertFalse($this->policy->view($this->otherUser, $this->voucher));
    }

    /**
     * Test that posted vouchers cannot be updated
     */
    public function test_cannot_update_posted_voucher(): void
    {
        // Create GL entry to mark voucher as posted
        GeneralLedger::factory()->create([
            'voucher_number' => $this->voucher->voucher_number,
        ]);

        // Cannot update even with permission if voucher is posted
        $this->assertFalse($this->policy->update($this->owner, $this->voucher));
    }

    /**
     * Test that vouchers in closed period cannot be updated
     */
    public function test_cannot_update_voucher_in_closed_period(): void
    {
        $period = FiscalPeriod::factory()->create([
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_closed' => true,
        ]);

        $voucher = JournalVoucher::factory()->create([
            'created_by' => $this->owner->id,
            'voucher_date' => '2024-06-15',
        ]);

        // Cannot update if period is closed
        $this->assertFalse($this->policy->update($this->owner, $voucher));
    }

    /**
     * Test that owner can update their own unposted voucher
     */
    public function test_owner_can_update_own_unposted_voucher(): void
    {
        // Owner should be able to update their own unposted voucher
        $this->assertTrue($this->policy->update($this->owner, $this->voucher));
    }
}

