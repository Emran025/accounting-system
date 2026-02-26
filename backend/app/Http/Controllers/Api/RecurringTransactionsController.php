<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecurringTransaction;
use App\Services\PermissionService;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RecurringTransactionsController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;

    public function __construct(LedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    public function index(Request $request): JsonResponse
    {


        $id = $request->query('id');
        if ($id) {
            $template = RecurringTransaction::findOrFail($id);
            return $this->successResponse($template);
        }

        $limit = $request->query('limit', 20);
        $data = RecurringTransaction::orderBy('name')->paginate($limit);

        return response()->json([
            'success' => true,
            'data' => $data->items(),
            'total' => $data->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {


        $action = $request->query('action');
        if ($action === 'process') {
            return $this->process($request);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'frequency' => 'required|string',
            'next_due_date' => 'required|date',
            'template_data' => 'required|array',
        ]);

        $template = RecurringTransaction::create($validated);

        return $this->successResponse(['id' => $template->id]);
    }

    public function update(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $template = RecurringTransaction::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'frequency' => 'required|string',
            'next_due_date' => 'required|date',
            'template_data' => 'required|array',
        ]);

        $template->update($validated);

        return $this->successResponse();
    }

    public function destroy(Request $request): JsonResponse
    {


        $id = $request->query('id');
        $template = RecurringTransaction::findOrFail($id);
        $template->delete();

        return $this->successResponse();
    }

    public function process(Request $request): JsonResponse
    {


        $templateId = $request->input('template_id');
        $generationDate = $request->input('generation_date', now()->format('Y-m-d'));

        $template = RecurringTransaction::findOrFail($templateId);
        $data = $template->template_data;

        $voucherNumber = null;

        if ($template->type === 'expense') {
            $voucherNumber = $this->ledgerService->postTransaction([
                ['account_code' => $data['account_code'], 'entry_type' => 'DEBIT', 'amount' => $data['amount'], 'description' => $data['description']],
                ['account_code' => '1110', 'entry_type' => 'CREDIT', 'amount' => $data['amount'], 'description' => $data['description']],
            ], 'recurring_transactions', $template->id, null, $generationDate);
        } elseif ($template->type === 'revenue') {
            $voucherNumber = $this->ledgerService->postTransaction([
                ['account_code' => '1110', 'entry_type' => 'DEBIT', 'amount' => $data['amount'], 'description' => $data['description']],
                ['account_code' => $data['account_code'], 'entry_type' => 'CREDIT', 'amount' => $data['amount'], 'description' => $data['description']],
            ], 'recurring_transactions', $template->id, null, $generationDate);
        } elseif ($template->type === 'journal_voucher') {
            $voucherNumber = $this->ledgerService->postTransaction(
                $data['entries'],
                'recurring_transactions',
                $template->id,
                null,
                $generationDate
            );
        }

        // Update next due date
        $nextDate = new \DateTime($template->next_due_date);
        switch ($template->frequency) {
            case 'daily': $nextDate->modify('+1 day'); break;
            case 'weekly': $nextDate->modify('+1 week'); break;
            case 'monthly': $nextDate->modify('+1 month'); break;
            case 'quarterly': $nextDate->modify('+3 months'); break;
            case 'annually': $nextDate->modify('+1 year'); break;
        }

        $template->update([
            'last_generated_date' => $generationDate,
            'next_due_date' => $nextDate->format('Y-m-d'),
        ]);

        return $this->successResponse(['voucher_number' => $voucherNumber]);
    }
}
