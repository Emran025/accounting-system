<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\ChartOfAccount;
use App\Models\JournalVoucher;
use Illuminate\Foundation\Testing\RefreshDatabase;

class JournalVouchersApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
        $this->seedChartOfAccounts();
    }

    public function test_can_list_journal_vouchers()
    {
        $account = ChartOfAccount::where('account_code', '1110')->first(); // Cash
        
        // Create a balanced JV (2 entries)
        JournalVoucher::factory()->create([
            'voucher_number' => 'JV-TEST',
            'account_id' => $account->id,
            'entry_type' => 'DEBIT',
            'amount' => 500
        ]);
        JournalVoucher::factory()->create([
            'voucher_number' => 'JV-TEST',
            'account_id' => $account->id, // Simplified: same account for test, typically different
            'entry_type' => 'CREDIT',
            'amount' => 500
        ]);

        $response = $this->authGet(route('api.journal_vouchers.index'));

        $this->assertSuccessResponse($response);
        $this->assertEquals(1, $response->json('total')); // 1 unique voucher number
        $this->assertEquals('JV-TEST', $response->json('vouchers.0.voucher_number'));
    }

    public function test_can_create_journal_voucher()
    {
        $debitAccount = ChartOfAccount::where('account_code', '1110')->first();
        $creditAccount = ChartOfAccount::where('account_code', '4100')->first(); // Sales

        $data = [
            'voucher_date' => now()->toDateString(),
            'description' => 'Test Manual Journal',
            'entries' => [
                [
                    'account_code' => $debitAccount->account_code,
                    'entry_type' => 'DEBIT',
                    'amount' => 1000,
                    'description' => 'Debit Cash'
                ],
                [
                    'account_code' => $creditAccount->account_code,
                    'entry_type' => 'CREDIT',
                    'amount' => 1000,
                    'description' => 'Credit Sales'
                ]
            ]
        ];

        $response = $this->authPost(route('api.journal_vouchers.store'), $data);

        $this->assertSuccessResponse($response);
        
        $voucherNumber = $response->json('voucher_number');
        $this->assertDatabaseHas('journal_vouchers', ['voucher_number' => $voucherNumber, 'amount' => 1000]);
        // Verify GL posting happened
        $this->assertDatabaseHas('general_ledger', ['reference_type' => 'journal_vouchers']);
    }

    public function test_validate_unbalanced_voucher_fails()
    {
        $account = ChartOfAccount::where('account_code', '1110')->first();

        $data = [
            'voucher_date' => now()->toDateString(),
            'description' => 'Unbalanced',
            'entries' => [
                [
                    'account_code' => $account->account_code,
                    'entry_type' => 'DEBIT',
                    'amount' => 1000
                ],
                [
                    'account_code' => $account->account_code,
                    'entry_type' => 'CREDIT',
                    'amount' => 900 // Mismatch
                ]
            ]
        ];

        $response = $this->authPost(route('api.journal_vouchers.store'), $data);

        $this->assertErrorResponse($response, 400);
        $this->assertStringContainsString('Debits (1000) must equal Credits (900)', $response->json('message')); // Assuming error format
    }
}
