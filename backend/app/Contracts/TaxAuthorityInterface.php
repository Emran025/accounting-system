<?php

namespace App\Contracts;

use App\Models\TaxAuthority;

/**
 * Interface for tax authority adapters (ZATCA, FTA, etc.).
 * ZATCA becomes one implementation, not the system itself.
 * Part of EPIC #1: Tax Engine Transformation.
 */
interface TaxAuthorityInterface
{
    /**
     * Get the tax authority model this adapter serves.
     */
    public function getAuthority(): TaxAuthority;

    /**
     * Generate compliance payload (e.g. UBL XML, QR code) for a transaction.
     *
     * @param object $transaction Invoice, Purchase, etc.
     * @return array ['xml_content' => ?, 'qr_code' => ?, ...]
     */
    public function generateCompliancePayload(object $transaction): array;

    /**
     * Validate transaction meets authority requirements before submission.
     */
    public function validateForSubmission(object $transaction): array;

    /**
     * Submit transaction to authority API (if applicable).
     *
     * @return array ['status' => 'submitted'|'rejected', 'uuid' => ?, 'error_message' => ?]
     */
    public function submit(object $transaction, string $submissionType = 'reporting'): array;

    /**
     * Whether this authority is enabled for the current tenant/company.
     */
    public function isEnabled(): bool;
}
