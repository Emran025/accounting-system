<?php
namespace App\Models\Finance;

use App\Core\Model;

class JournalEntry extends Model {
    protected $table = 'journal_entries';

    public function createEntry($description, $date, $lines) {
        $this->db->beginTransaction();

        try {
            // Header
            $stmt = $this->db->prepare("INSERT INTO journal_entries (description, entry_date, created_by) VALUES (?, ?, ?)");
            $stmt->execute([$description, $date, $_SESSION['user_id'] ?? null]);
            $entryId = $this->db->lastInsertId();

            // Details/Lines
            $lineModel = new JournalEntryLine();
            $totalDebit = 0;
            $totalCredit = 0;

            foreach ($lines as $line) {
                // $line should have account_id, debit, credit
                $lineModel->addLine($entryId, $line['account_id'], $line['debit'], $line['credit']);
                $totalDebit += $line['debit'];
                $totalCredit += $line['credit'];
            }

            if (abs($totalDebit - $totalCredit) > 0.001) {
                throw new \Exception("Journal Entry Not Balanced! Debit: $totalDebit, Credit: $totalCredit");
            }

            $this->db->commit();
            return $entryId;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
