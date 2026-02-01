<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\LedgerService;
use App\Models\ChartOfAccount;
use App\Models\FiscalPeriod;
use App\Models\GeneralLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

/**
 * Test fiscal period validation in LedgerService
 * 
 * Verifies that:
 * - Transactions cannot be back-dated into closed periods
 * - Voucher dates must fall within fiscal period bounds
 * - Locked periods prevent new transactions
 */
class LedgerServiceFiscalPeriodTest extends TestCase
{
    use RefreshDatabase;

    private LedgerService $ledgerService;
    private ChartOfAccount $debitAccount;
    private ChartOfAccount $creditAccount;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ledgerService = new LedgerService();

        // Create test accounts
        $this->debitAccount = ChartOfAccount::factory()->asset()->create();
        $this->creditAccount = ChartOfAccount::factory()->revenue()->create();
    }

    /**
     * Test that voucher date must be within fiscal period
     */
    public function test_voucher_date_must_be_within_fiscal_period(): void
    {
        // Create a fiscal period for 2025
        $period = FiscalPeriod::factory()->create([
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
            'is_closed' => false,
            'is_locked' => false,
        ]);

        $entries = [
            [
                'account_code' => $this->debitAccount->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
            [
                'account_code' => $this->creditAccount->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
        ];

        // Should succeed with date within period
        $voucherNumber = $this->ledgerService->postTransaction(
            $entries,
            null,
            null,
            null,
            '2025-06-15' // Date within period
        );

        $this->assertNotNull($voucherNumber);

        // Should fail with date before period
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Voucher date (2024-12-31) is outside fiscal period');

        $this->ledgerService->postTransaction(
            $entries,
            null,
            null,
            null,
            '2024-12-31' // Date before period
        );
    }

    /**
     * Test that transactions cannot be posted to locked periods
     */
    public function test_cannot_post_to_locked_period(): void
    {
        $period = FiscalPeriod::factory()->create([
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
            'is_closed' => false,
            'is_locked' => true, // Period is locked
        ]);

        $entries = [
            [
                'account_code' => $this->debitAccount->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
            [
                'account_code' => $this->creditAccount->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
        ];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot post transactions to a locked fiscal period');

        $this->ledgerService->postTransaction($entries);
    }

    /**
     * Test that transactions cannot be posted to closed periods
     */
    public function test_cannot_post_to_closed_period(): void
    {
        $period = FiscalPeriod::factory()->create([
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_closed' => true, // Period is closed
            'is_locked' => false,
        ]);

        $entries = [
            [
                'account_code' => $this->debitAccount->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
            [
                'account_code' => $this->creditAccount->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
        ];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Cannot post transactions to a closed fiscal period');

        $this->ledgerService->postTransaction(
            $entries,
            null,
            null,
            null,
            '2024-06-15' // Date in closed period
        );
    }

    /**
     * Test that current period transactions work correctly
     */
    public function test_current_period_transactions_succeed(): void
    {
        // Create current period
        $period = FiscalPeriod::factory()->create([
            'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
            'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
            'is_closed' => false,
            'is_locked' => false,
        ]);

        $entries = [
            [
                'account_code' => $this->debitAccount->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
            [
                'account_code' => $this->creditAccount->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 1000,
                'description' => 'Test'
            ],
        ];

        $voucherNumber = $this->ledgerService->postTransaction($entries);

        $this->assertNotNull($voucherNumber);

        // Verify ledger entry was created
        $ledgerEntry = GeneralLedger::where('voucher_number', $voucherNumber)->first();
        $this->assertNotNull($ledgerEntry);
        $this->assertEquals($period->id, $ledgerEntry->fiscal_period_id);
    }
}

