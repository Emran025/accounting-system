<?php
namespace Tests\Unit;
use Tests\TestCase;
use App\Models\UniversalJournal;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DebugTest extends TestCase {
    use RefreshDatabase;
    public function test_journal_creation() {
        $service = new LedgerService();
        $voucher = $service->getNextVoucherNumber('PUR');
        fwrite(STDOUT, "Generated Voucher: $voucher\n");
        $journal = UniversalJournal::where('voucher_number', $voucher)->first();
        fwrite(STDOUT, "Journal in DB? " . ($journal ? 'Yes (ID:'.$journal->id.')' : 'No') . "\n");
        $this->assertNotNull($journal);
    }
}
