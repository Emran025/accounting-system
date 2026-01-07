<?php
namespace App\Models\Finance;

use App\Core\Model;

class JournalEntryLine extends Model {
    protected $table = 'journal_entry_lines';

    public function addLine($entryId, $accountId, $debit = 0, $credit = 0) {
        $stmt = $this->db->prepare("INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)");
        return $stmt->execute([$entryId, $accountId, $debit, $credit]);
    }

    public function getLines($entryId) {
        $stmt = $this->db->prepare("SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?");
        $stmt->execute([$entryId]);
        return $stmt->fetchAll();
    }
}
