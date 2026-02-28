<?php

namespace App\Services\Tax;

use App\Contracts\TaxAuthorityInterface;
use App\Models\Invoice;
use App\Models\Setting;
use App\Models\TaxAuthority;
use App\Services\UBLGeneratorService;
use App\Services\QRCodeService;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * ZATCA (Saudi Tax Authority) as Tax Authority Adapter.
 * Implements TaxAuthorityInterface - ZATCA is one plugin, not the system.
 * Part of EPIC #1: Tax Engine Transformation.
 */
class ZATCATaxAuthority implements TaxAuthorityInterface
{
    private UBLGeneratorService $ublGenerator;
    private QRCodeService $qrCodeService;
    private ?TaxAuthority $authority = null;

    public function __construct(
        UBLGeneratorService $ublGenerator,
        QRCodeService $qrCodeService
    ) {
        $this->ublGenerator = $ublGenerator;
        $this->qrCodeService = $qrCodeService;
    }

    public function getAuthority(): TaxAuthority
    {
        if ($this->authority === null) {
            $this->authority = TaxAuthority::where('code', 'ZATCA')
                ->where('is_active', true)
                ->firstOrFail();
        }
        return $this->authority;
    }

    public function generateCompliancePayload(object $transaction): array
    {
        if (!$transaction instanceof Invoice) {
            throw new Exception('ZATCA adapter only supports Invoice transactions');
        }

        $xmlContent = $this->ublGenerator->generate($transaction);
        $qrCodeData = $this->generateQRCodeData($transaction);
        $qrCode = $this->qrCodeService->generate($qrCodeData);

        return [
            'xml_content' => $xmlContent,
            'xml_hash' => hash('sha256', $xmlContent),
            'qr_code' => $qrCode,
            'zatca_qr_code' => $qrCodeData,
        ];
    }

    public function validateForSubmission(object $transaction): array
    {
        $errors = [];
        if (!$transaction instanceof Invoice) {
            $errors[] = 'Transaction must be an Invoice';
            return $errors;
        }

        if (!$transaction->items || $transaction->items->isEmpty()) {
            $errors[] = 'Invoice must have at least one item';
        }
        if (!$transaction->invoice_number) {
            $errors[] = 'Invoice number is required';
        }
        $taxNumber = Setting::where('setting_key', 'tax_number')->value('setting_value');
        if (!$taxNumber) {
            $errors[] = 'Company tax number must be configured for ZATCA submission';
        }

        return $errors;
    }

    public function submit(object $transaction, string $submissionType = 'reporting'): array
    {
        $errors = $this->validateForSubmission($transaction);
        if (!empty($errors)) {
            return [
                'status' => 'rejected',
                'uuid' => null,
                'error_message' => implode('; ', $errors),
            ];
        }

        try {
            $payload = $this->generateCompliancePayload($transaction);
            $signedXml = $this->signXml($payload['xml_content']);
            $apiResponse = $this->submitToZatcaApi($signedXml, $submissionType);

            return [
                'status' => $apiResponse['valid'] ? 'submitted' : 'rejected',
                'uuid' => $apiResponse['uuid'] ?? null,
                'qr_code' => $apiResponse['qr_code'] ?? $payload['zatca_qr_code'] ?? null,
                'error_message' => $apiResponse['error_message'] ?? null,
            ];
        } catch (Exception $e) {
            Log::error('ZATCA submit failed: ' . $e->getMessage());
            return [
                'status' => 'rejected',
                'uuid' => null,
                'error_message' => $e->getMessage(),
            ];
        }
    }

    public function isEnabled(): bool
    {
        $enabled = Setting::where('setting_key', 'zatca_enabled')->value('setting_value');
        $country = Setting::where('setting_key', 'company_country')->value('setting_value');
        return filter_var($enabled, FILTER_VALIDATE_BOOLEAN) || $country === 'SA';
    }

    private function generateQRCodeData(Invoice $invoice): string
    {
        $settings = Setting::whereIn('setting_key', ['company_name', 'tax_number', 'store_name'])
            ->pluck('setting_value', 'setting_key')->toArray();

        $timestamp = $invoice->created_at->toIso8601String();
        $total = number_format($invoice->total_amount, 2, '.', '');
        $vatAmount = number_format($invoice->vat_amount, 2, '.', '');

        $tlvData = [
            1 => $settings['store_name'] ?? $settings['company_name'] ?? 'Company Name',
            2 => $settings['tax_number'] ?? '',
            3 => $timestamp,
            4 => $total,
            5 => $vatAmount,
        ];

        $tlvString = '';
        foreach ($tlvData as $tag => $value) {
            $valueBytes = mb_convert_encoding($value, 'UTF-8');
            $tlvString .= chr($tag) . chr(strlen($valueBytes)) . $valueBytes;
        }

        return base64_encode($tlvString);
    }

    private function signXml(string $xmlContent): string
    {
        $token = Setting::where('setting_key', 'zatca_binary_token')->value('setting_value');
        Log::warning('ZATCA XML signing not fully implemented - using placeholder');
        return $xmlContent . "<!-- Signed with " . ($token ? 'token' : 'file') . " certificate -->";
    }

    private function submitToZatcaApi(string $signedXml, string $submissionType): array
    {
        $env = config('zatca.environment', 'sandbox');
        if ($env === 'sandbox') {
            return [
                'valid' => true,
                'uuid' => 'urn:uuid:' . \Illuminate\Support\Str::uuid(),
                'qr_code' => base64_encode('mock_qr_code_data'),
                'error_message' => null,
            ];
        }
        throw new Exception('ZATCA API integration not configured for production');
    }
}
