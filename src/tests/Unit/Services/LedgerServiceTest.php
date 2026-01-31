<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LedgerServiceTest extends TestCase
{
    use RefreshDatabase;

    private LedgerService $ledgerService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ledgerService = new LedgerService();
    }

    public function test_get_next_voucher_number_increments_sequence()
    {
        // First call
        $voucher1 = $this->ledgerService->getNextVoucherNumber('JV');
        $this->assertEquals('JV-000001', $voucher1);

        // Second call
        $voucher2 = $this->ledgerService->getNextVoucherNumber('JV');
        $this->assertEquals('JV-000002', $voucher2);
        
        // Different sequence
        $inv1 = $this->ledgerService->getNextVoucherNumber('INV');
        $this->assertEquals('INV-000001', $inv1);
    }

    public function test_post_transaction_creates_ledger_entries()
    {
        $debitAccount = ChartOfAccount::factory()->asset()->create();
        $creditAccount = ChartOfAccount::factory()->revenue()->create();
        
        $entries = [
            [
                'account_id' => $debitAccount->id,
                'debit' => 1000,
                'credit' => 0,
                'description' => 'Test Debit'
            ],
            [
                'account_id' => $creditAccount->id,
                'debit' => 0,
                'credit' => 1000,
                'description' => 'Test Credit'
            ]
        ];

        $voucherNumber = $this->ledgerService->postTransaction($entries, 'MANUAL', 1, 'JV-TEST');

        $this->assertDatabaseHas('general_ledgers', [
            'account_id' => $debitAccount->id,
            'debit' => 1000,
            'credit' => 0,
            'description' => 'Test Debit',
            'voucher_number' => 'JV-TEST'
        ]);

        $this->assertDatabaseHas('general_ledgers', [
            'account_id' => $creditAccount->id,
            'debit' => 0,
            'credit' => 1000,
            'description' => 'Test Credit',
            'voucher_number' => 'JV-TEST'
        ]);
        
        $this->assertEquals('JV-TEST', $voucherNumber);
    }

    public function test_post_transaction_throws_exception_if_not_balanced()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Transaction is not balanced');

        $account = ChartOfAccount::factory()->asset()->create();

        $entries = [
            [
                'account_id' => $account->id,
                'debit' => 1000,
                'credit' => 0,
            ]
        ];

        $this->ledgerService->postTransaction($entries);
    }

    public function test_get_account_balance_calculates_correctly()
    {
        $account = ChartOfAccount::factory()->asset()->create();
        
        // Add some debit entries
        GeneralLedger::create([
            'account_id' => $account->id,
            'debit' => 500,
            'credit' => 0,
            'entry_date' => now(),
            'voucher_number' => 'JV-001',
            'description' => 'Debit 1'
        ]);
        
        GeneralLedger::create([
            'account_id' => $account->id,
            'debit' => 300,
            'credit' => 0,
            'entry_date' => now(),
            'voucher_number' => 'JV-002',
            'description' => 'Debit 2'
        ]);

        // Add a credit entry
        GeneralLedger::create([
            'account_id' => $account->id,
            'debit' => 0,
            'credit' => 200,
            'entry_date' => now(),
            'voucher_number' => 'JV-003',
            'description' => 'Credit 1'
        ]);

        // 500 + 300 - 200 = 600
        $balance = $this->ledgerService->getAccountBalance($account->id);
        
        $this->assertEquals(600, $balance);
    }

    public function test_reverse_transaction_creates_reversing_entries()
    {
        $debitAccount = ChartOfAccount::factory()->asset()->create();
        $creditAccount = ChartOfAccount::factory()->revenue()->create();
        
        // Initial transaction
        $entries = [
            [
                'account_id' => $debitAccount->id,
                'debit' => 1000,
                'credit' => 0,
            ],
            [
                'account_id' => $creditAccount->id,
                'debit' => 0,
                'credit' => 1000,
            ]
        ];

        $originalVoucher = $this->ledgerService->postTransaction($entries);

        // Reverse it
        $reversalVoucher = $this->ledgerService->reverseTransaction($originalVoucher, 'Reversal Test');

        // Check reversal entries
        $this->assertDatabaseHas('general_ledgers', [
            'voucher_number' => $reversalVoucher,
            'account_id' => $debitAccount->id,
            'debit' => 0,
            'credit' => 1000, // Reversed
            'is_reversed' => true
        ]);

        $this->assertDatabaseHas('general_ledgers', [
            'voucher_number' => $reversalVoucher,
            'account_id' => $creditAccount->id,
            'debit' => 1000, // Reversed
            'credit' => 0,
            'is_reversed' => true
        ]);
        
        // Check original entries marked as reversed
        $this->assertDatabaseHas('general_ledgers', [
            'voucher_number' => $originalVoucher,
            'is_reversed' => true
        ]);
    }
}
