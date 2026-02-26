<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reconciliation;
use App\Services\PermissionService;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BankReconciliationController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;

    public function __construct(LedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    public function index(Request $request): JsonResponse
    {


        $action = $request->query('action');
        if ($action === 'calculate') {
            $date = $request->query('date', now()->format('Y-m-d'));
            // In a real system, we'd look up the Bank account code from settings
            $ledger_balance = $this->ledgerService->getAccountBalance('1110', $date);
            return $this->successResponse(['ledger_balance' => $ledger_balance]);
        }

        $limit = $request->query('limit', 20);
        $data = Reconciliation::orderBy('reconciliation_date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'data' => $data->items(),
            'total' => $data->total(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'reconciliation_date' => 'required|date',
            'physical_balance' => 'required|numeric',
            'notes' => 'nullable|string',
        ]);

        $ledger_balance = $this->ledgerService->getAccountBalance('1110', $validated['reconciliation_date']);
        $validated['ledger_balance'] = $ledger_balance;
        $validated['difference'] = $validated['physical_balance'] - $ledger_balance;
        $validated['account_code'] = '1110';

        $reconciliation = Reconciliation::create($validated);

        return $this->successResponse(['id' => $reconciliation->id]);
    }

    public function update(Request $request): JsonResponse
    {

        $action = $request->query('action');

        if ($action === 'adjust') {
            $validated = $request->validate([
                'reconciliation_id' => 'required|exists:reconciliations,id',
                'amount' => 'required|numeric',
                'entry_type' => 'required|in:DEBIT,CREDIT',
                'description' => 'required|string',
            ]);

            $reconciliation = Reconciliation::findOrFail($validated['reconciliation_id']);
            
            // Post adjustment to GL
            // The provided entry_type applies to the cash/bank account (1110)
            $offsetAccount = $validated['entry_type'] === 'DEBIT' ? '5290' : '5101';
            
            $this->ledgerService->postTransaction([
                ['account_code' => '1110', 'entry_type' => $validated['entry_type'], 'amount' => $validated['amount'], 'description' => $validated['description']],
                ['account_code' => $offsetAccount, 'entry_type' => $validated['entry_type'] === 'DEBIT' ? 'CREDIT' : 'DEBIT', 'amount' => $validated['amount'], 'description' => $validated['description']],
            ], 'reconciliations', $reconciliation->id, null, $reconciliation->reconciliation_date);

            // Recalculate difference
            $new_ledger_balance = $this->ledgerService->getAccountBalance('1110', $reconciliation->reconciliation_date);
            $reconciliation->update([
                'ledger_balance' => $new_ledger_balance,
                'difference' => $reconciliation->physical_balance - $new_ledger_balance
            ]);

            return $this->successResponse();
        }

        return $this->errorResponse('Invalid action');
    }
}
