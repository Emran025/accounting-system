<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\ZatcaEinvoice;
use App\Services\ZATCAService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class ZATCAInvoiceController extends Controller
{
    private ZATCAService $zatcaService;

    public function __construct(ZATCAService $zatcaService)
    {
        $this->zatcaService = $zatcaService;
    }

    /**
     * Submit an invoice to ZATCA.
     *
     * @param Request $request
     * @param int $invoiceId
     * @return \Illuminate\Http\JsonResponse
     */
    public function submit(Request $request, $invoiceId)
    {
        try {
            // Check if ZATCA is enabled
            if (!$this->zatcaService->isEnabled()) {
                return response()->json([
                    'status' => 'skipped',
                    'message' => 'ZATCA integration is disabled or not applicable for this region.'
                ], 200);
            }

            $invoice = Invoice::findOrFail($invoiceId);

            // Check if already submitted
            $existing = ZatcaEinvoice::where('invoice_id', $invoice->id)
                ->where('status', 'submitted')
                ->first();

            if ($existing) {
                return response()->json([
                    'status' => 'already_submitted',
                    'data' => $existing
                ], 200);
            }

            // Get submission type from request (default: reporting)
            $submissionType = $request->input('submission_type', 'reporting');

            // Process Invoice (Transaction for safety)
            return DB::transaction(function () use ($invoice, $submissionType) {
                // Use ZATCA Service to handle submission
                $result = $this->zatcaService->submitInvoice($invoice, $submissionType);

                $zatcaInvoice = ZatcaEinvoice::updateOrCreate(
                    ['invoice_id' => $invoice->id],
                    [
                        'xml_content' => $result['xml_content'],
                        'hash' => $result['xml_hash'],
                        'signed_xml' => $result['signed_xml'],
                        'qr_code' => substr($result['qr_code'], 0, 255),
                        'zatca_qr_code' => $result['zatca_qr_code'],
                        'zatca_uuid' => $result['zatca_uuid'],
                        'status' => $result['status'],
                        'signed_at' => now(),
                        'submitted_at' => $result['status'] === 'submitted' ? now() : null,
                    ]
                );

                if ($result['status'] === 'rejected') {
                    throw new Exception('ZATCA Rejection: ' . ($result['error_message'] ?? 'Unknown error'));
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Invoice submitted to ZATCA successfully',
                    'data' => $zatcaInvoice
                ]);
            });

        } catch (Exception $e) {
            Log::error("ZATCA Submission Error: " . $e->getMessage(), [
                'invoice_id' => $invoiceId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit invoice to ZATCA',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    public function getStatus($invoiceId)
    {
         $zatca = ZatcaEinvoice::where('invoice_id', $invoiceId)->first();
         
         if (!$zatca) {
             return response()->json(['status' => 'not_generated']);
         }
         
         return response()->json(['status' => $zatca->status, 'data' => $zatca]);
    }
}
