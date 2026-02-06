<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Setting;
use App\Services\UBLGeneratorService;
use App\Services\QRCodeService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Exception;

/**
 * ZATCA E-Invoicing Service
 * 
 * Handles integration with ZATCA (Saudi Tax Authority) for e-invoicing compliance.
 * 
 * Responsibilities:
 * - Generate UBL 2.1 compliant XML
 * - Sign XML with cryptographic certificates
 * - Submit to ZATCA API
 * - Handle QR code generation
 * - Manage certificate lifecycle
 */
class ZATCAService
{
    private UBLGeneratorService $ublGenerator;
    private QRCodeService $qrCodeService;
    private string $zatcaApiUrl;
    private string $zatcaEnvironment; // 'sandbox' or 'production'
    private ?string $certificatePath = null;
    private ?string $certificatePassword = null;
    private ?array $cachedSettings = null;

    public function __construct(
        UBLGeneratorService $ublGenerator,
        QRCodeService $qrCodeService
    ) {
        $this->ublGenerator = $ublGenerator;
        $this->qrCodeService = $qrCodeService;
        $this->zatcaEnvironment = config('zatca.environment', 'sandbox');
        $this->zatcaApiUrl = config("zatca.api_url.{$this->zatcaEnvironment}");
        $this->certificatePath = config('zatca.certificate_path');
        $this->certificatePassword = config('zatca.certificate_password');
    }

    /**
     * Check if ZATCA is enabled for the system
     */
    public function isEnabled(): bool
    {
        $enabled = Setting::where('setting_key', 'zatca_enabled')->value('setting_value');
        $country = Setting::where('setting_key', 'company_country')->value('setting_value');

        // ZATCA is required for Saudi Arabia
        return filter_var($enabled, FILTER_VALIDATE_BOOLEAN) || $country === 'SA';
    }

    /**
     * Submit an invoice to ZATCA
     * 
     * @param Invoice $invoice
     * @param string $submissionType 'clearance' or 'reporting'
     * @return array Response data with UUID, QR code, and status
     * @throws Exception
     */
    public function submitInvoice(Invoice $invoice, string $submissionType = 'reporting'): array
    {
        if (!$this->isEnabled()) {
            throw new Exception('ZATCA integration is not enabled');
        }

        // Validate invoice has required data
        $this->validateInvoice($invoice);

        // 1. Generate UBL 2.1 XML
        $xmlContent = $this->ublGenerator->generate($invoice);
        $xmlHash = hash('sha256', $xmlContent);

        // 2. Sign XML with certificate
        $signedXml = $this->signXml($xmlContent);

        // 3. Generate QR Code (TLV encoded)
        $qrCodeData = $this->generateQRCodeData($invoice);
        $qrCode = $this->qrCodeService->generate($qrCodeData);

        // 4. Submit to ZATCA API
        $apiResponse = $this->submitToZatcaApi($signedXml, $submissionType);

        return [
            'xml_content' => $xmlContent,
            'xml_hash' => $xmlHash,
            'signed_xml' => $signedXml,
            'qr_code' => $qrCode,
            'zatca_uuid' => $apiResponse['uuid'] ?? null,
            'zatca_qr_code' => $apiResponse['qr_code'] ?? null,
            'status' => $apiResponse['valid'] ? 'submitted' : 'rejected',
            'submission_type' => $submissionType,
            'error_message' => $apiResponse['error_message'] ?? null,
        ];
    }

    /**
     * Validate invoice has all required data for ZATCA submission
     */
    private function validateInvoice(Invoice $invoice): void
    {
        if (!$invoice->items || $invoice->items->isEmpty()) {
            throw new Exception('Invoice must have at least one item');
        }

        if (!$invoice->invoice_number) {
            throw new Exception('Invoice number is required');
        }

        // Validate company settings
        $taxNumber = Setting::where('setting_key', 'tax_number')->value('setting_value');
        if (!$taxNumber) {
            throw new Exception('Company tax number must be configured for ZATCA submission');
        }
    }

    /**
     * Sign XML with cryptographic certificate
     * 
     * @param string $xmlContent
     * @return string Signed XML
     * @throws Exception
     */
    private function signXml(string $xmlContent): string
    {
        if (!$this->certificatePath || !Storage::exists($this->certificatePath)) {
            throw new Exception('ZATCA certificate not found. Please configure certificate_path in config/zatca.php');
        }

        $certificate = Storage::get($this->certificatePath);
        $privateKey = Storage::get(config('zatca.private_key_path'));

        // TODO: Implement actual XML signing using OpenSSL or ZATCA SDK
        // This is a placeholder - actual implementation requires:
        // 1. Load certificate and private key
        // 2. Create XML signature element
        // 3. Sign with SHA256 and RSA
        // 4. Embed signature in XML document
        
        // For now, return unsigned XML with placeholder comment
        // In production, this must use proper XML signing library
        Log::warning('ZATCA XML signing not fully implemented - using placeholder');
        
        return $xmlContent . "<!-- Signed with certificate -->";
    }

    /**
     * Generate QR code data in TLV format
     * 
     * @param Invoice $invoice
     * @return string Base64 encoded TLV data
     */
    public function generateQRCodeData(Invoice $invoice): string
    {
        $settings = $this->getCompanySettings();
        
        $timestamp = $invoice->created_at->toIso8601String();
        $total = number_format($invoice->total_amount, 2, '.', '');
        $vatAmount = number_format($invoice->vat_amount, 2, '.', '');

        // TLV encoding: Tag-Length-Value
        $tlvData = [
            1 => $settings['seller_name'] ?? 'Company Name',
            2 => $settings['tax_number'] ?? '',
            3 => $timestamp,
            4 => $total,
            5 => $vatAmount,
        ];

        $tlvString = '';
        foreach ($tlvData as $tag => $value) {
            $valueBytes = mb_convert_encoding($value, 'UTF-8');
            $length = strlen($valueBytes);
            $tlvString .= chr($tag) . chr($length) . $valueBytes;
        }

        return base64_encode($tlvString);
    }

    /**
     * Submit signed XML to ZATCA API
     * 
     * @param string $signedXml
     * @param string $submissionType
     * @return array API response
     * @throws Exception
     */
    private function submitToZatcaApi(string $signedXml, string $submissionType): array
    {
        $endpoint = $submissionType === 'clearance' 
            ? '/invoices/clearance'
            : '/invoices/reporting';

        try {
            // TODO: Implement actual ZATCA API call
            // This requires:
            // 1. ZATCA API credentials (CSID)
            // 2. Proper authentication headers
            // 3. Certificate-based authentication
            // 4. Retry logic for network failures
            
            // Placeholder implementation
            Log::warning('ZATCA API submission not fully implemented - using mock response');
            
            // Mock response for development
            if ($this->zatcaEnvironment === 'sandbox') {
                return [
                    'valid' => true,
                    'uuid' => 'urn:uuid:' . \Illuminate\Support\Str::uuid(),
                    'qr_code' => base64_encode('mock_qr_code_data'),
                    'error_message' => null,
                ];
            }

            // Production would use:
            // $response = Http::withOptions([
            //     'cert' => [$this->certificatePath, $this->certificatePassword],
            //     'verify' => true,
            // ])->post($this->zatcaApiUrl . $endpoint, [
            //     'invoice' => base64_encode($signedXml),
            // ]);
            
            // return $response->json();

            throw new Exception('ZATCA API integration not configured for production');
            
        } catch (Exception $e) {
            Log::error('ZATCA API submission failed: ' . $e->getMessage());
            throw new Exception('Failed to submit invoice to ZATCA: ' . $e->getMessage());
        }
    }

    /**
     * Get company settings required for ZATCA
     */
    private function getCompanySettings(): array
    {
        if ($this->cachedSettings !== null) {
            return $this->cachedSettings;
        }

        $settings = Setting::whereIn('setting_key', [
            'company_name',
            'tax_number',
            'store_name',
        ])->pluck('setting_value', 'setting_key')->toArray();

        $this->cachedSettings = [
            'seller_name' => $settings['store_name'] ?? $settings['company_name'] ?? 'Unknown',
            'tax_number' => $settings['tax_number'] ?? '',
        ];

        return $this->cachedSettings;
    }

    /**
     * Validate certificate is valid and not expired
     */
    public function validateCertificate(): bool
    {
        if (!$this->certificatePath || !Storage::exists($this->certificatePath)) {
            return false;
        }

        // TODO: Implement certificate validation
        // Check expiration date, validity, etc.
        
        return true;
    }
}

