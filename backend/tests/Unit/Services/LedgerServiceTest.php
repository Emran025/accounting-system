<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Models\UniversalJournal;
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
        $id1 = (int)str_replace('JV-', '', $voucher1);
        $this->assertGreaterThan(0, $id1);

        // Second call
        $voucher2 = $this->ledgerService->getNextVoucherNumber('JV');
        $id2 = (int)str_replace('JV-', '', $voucher2);
        $this->assertEquals($id1 + 1, $id2);
        
        // Different sequence sharing same ID pool (since ID is from UniversalJournal table pk)
        $inv1 = $this->ledgerService->getNextVoucherNumber('INV');
        $id3 = (int)str_replace('INV-', '', $inv1);
        $this->assertGreaterThan($id2, $id3);
    }

    public function test_post_transaction_creates_ledger_entries()
    {
        $debitAccount = ChartOfAccount::factory()->asset()->create();
        $creditAccount = ChartOfAccount::factory()->revenue()->create();
        
        $entries = [
            [
                'account_code' => $debitAccount->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
                'description' => 'Test Debit'
            ],
            [
                'account_code' => $creditAccount->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 1000,
                'description' => 'Test Credit'
            ]
        ];

        UniversalJournal::factory()->create(['voucher_number' => 'JV-TEST', 'document_type' => 'MANUAL']);
        $voucherNumber = $this->ledgerService->postTransaction($entries, 'MANUAL', 1, 'JV-TEST');

        $this->assertDatabaseHas('general_ledger', [
            'account_id' => $debitAccount->id,
            'amount' => 1000,
            'entry_type' => 'DEBIT',
            'voucher_number' => 'JV-TEST'
        ]);

        $this->assertDatabaseHas('general_ledger', [
            'account_id' => $creditAccount->id,
            'amount' => 1000,
            'entry_type' => 'CREDIT',
            'voucher_number' => 'JV-TEST'
        ]);
        
        $this->assertEquals('JV-TEST', $voucherNumber);
    }

    public function test_post_transaction_throws_exception_if_not_balanced()
    {
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Debits (1000) must equal Credits (500)');

        $account = ChartOfAccount::factory()->asset()->create();

        $entries = [
            [
                'account_code' => $account->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
            ]
        ];

        // Need at least 2 entries check is first, but here we provide 1.
        // Wait, Code says "At least two entries".
        // If I provide just 1, exception "At least two entries...".
        // The previous test expected "Transaction is not balanced".
        // Let's create a balanced *structure* but numerically unbalanced.
        
        $entries = [
            [
                'account_code' => $account->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
            ],
            [
                'account_code' => $account->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 500, 
            ]
        ];

        $this->ledgerService->postTransaction($entries);
    }

    public function test_get_account_balance_calculates_correctly()
    {
        $account = ChartOfAccount::factory()->asset()->create();
        $offsetAccount = ChartOfAccount::factory()->revenue()->create();
        
        // Add some debit entries
        \App\Models\UniversalJournal::factory()->create(['voucher_number' => 'JV-001', 'document_type' => 'MANUAL']);
        $this->ledgerService->postTransaction([
            ['account_code' => $account->account_code, 'entry_type' => 'DEBIT', 'amount' => 500],
            ['account_code' => $offsetAccount->account_code, 'entry_type' => 'CREDIT', 'amount' => 500],
        ], 'MANUAL', null, 'JV-001');
        
        \App\Models\UniversalJournal::factory()->create(['voucher_number' => 'JV-002', 'document_type' => 'MANUAL']);
        $this->ledgerService->postTransaction([
            ['account_code' => $account->account_code, 'entry_type' => 'DEBIT', 'amount' => 300],
            ['account_code' => $offsetAccount->account_code, 'entry_type' => 'CREDIT', 'amount' => 300],
        ], 'MANUAL', null, 'JV-002');

        // Add a credit entry
        \App\Models\UniversalJournal::factory()->create(['voucher_number' => 'JV-003', 'document_type' => 'MANUAL']);
        $this->ledgerService->postTransaction([
            ['account_code' => $account->account_code, 'entry_type' => 'CREDIT', 'amount' => 200],
            ['account_code' => $offsetAccount->account_code, 'entry_type' => 'DEBIT', 'amount' => 200],
        ], 'MANUAL', null, 'JV-003');

        // 500 + 300 - 200 = 600
        $balance = $this->ledgerService->getAccountBalance($account->account_code);
        
        $this->assertEquals(600, $balance);
    }

    public function test_reverse_transaction_creates_reversing_entries()
    {
        $debitAccount = ChartOfAccount::factory()->asset()->create();
        $creditAccount = ChartOfAccount::factory()->revenue()->create();
        
        // Initial transaction
        $entries = [
            [
                'account_code' => $debitAccount->account_code,
                'entry_type' => 'DEBIT',
                'amount' => 1000,
            ],
            [
                'account_code' => $creditAccount->account_code,
                'entry_type' => 'CREDIT',
                'amount' => 1000,
            ]
        ];

        $originalVoucher = $this->ledgerService->postTransaction($entries);

        // Reverse it
        $reversalVoucher = $this->ledgerService->reverseTransaction($originalVoucher, 'Reversal Test');

        // Check reversal entries
        // Check reversal entries
        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $reversalVoucher,
            'account_id' => $debitAccount->id,
            'amount' => 1000,
            'entry_type' => 'CREDIT' // Reversed
        ]);

        $this->assertDatabaseHas('general_ledger', [
            'voucher_number' => $reversalVoucher,
            'account_id' => $creditAccount->id,
            'amount' => 1000,
            'entry_type' => 'DEBIT' // Reversed
        ]);
        
        // We cannot check is_reversed on original entries as the specific column doesn't exist
        // The service implements reversal by adding new contra entries.
    }
}
