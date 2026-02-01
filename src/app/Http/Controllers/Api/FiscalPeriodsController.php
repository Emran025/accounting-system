<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FiscalPeriod;
use App\Models\ChartOfAccount;
use App\Models\GeneralLedger;
use App\Services\PermissionService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FiscalPeriodsController extends Controller
{
    use BaseApiController;

    private LedgerService $ledgerService;
    private ChartOfAccountsMappingService $coaService;

    public function __construct(
        LedgerService $ledgerService,
        ChartOfAccountsMappingService $coaService
    ) {
        $this->ledgerService = $ledgerService;
        $this->coaService = $coaService;
    }

    /**
     * Get all fiscal periods
     */
    public function index(Request $request): JsonResponse
    {


        $periods = FiscalPeriod::orderBy('start_date', 'desc')->get();

        return $this->successResponse($periods);
    }

    /**
     * Create a new fiscal period
     */
    public function store(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'period_name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        // Check for overlapping periods
        $overlap = FiscalPeriod::where(function ($query) use ($validated) {
            $query->whereBetween('start_date', [$validated['start_date'], $validated['end_date']])
                ->orWhereBetween('end_date', [$validated['start_date'], $validated['end_date']])
                ->orWhere(function ($q) use ($validated) {
                    $q->where('start_date', '<=', $validated['start_date'])
                      ->where('end_date', '>=', $validated['end_date']);
                });
        })->exists();

        if ($overlap) {
            return $this->errorResponse('Period overlaps with an existing fiscal period', 409);
        }

        $period = FiscalPeriod::create([
            'period_name' => $validated['period_name'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'is_closed' => false,
            'is_locked' => false,
            'created_by' => auth()->id() ?? session('user_id'),
        ]);

        return $this->successResponse(['id' => $period->id]);
    }

    /**
     * Close a fiscal period
     */
    public function close(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:fiscal_periods,id',
        ]);

        $period = FiscalPeriod::findOrFail($validated['id']);

        if ($period->is_closed) {
            return $this->errorResponse('Period is already closed', 400);
        }

        if ($period->is_locked) {
            return $this->errorResponse('Cannot close a locked period', 400);
        }

        return DB::transaction(function () use ($period) {
            // Calculate net income for the period
            $netIncome = $this->calculatePeriodNetIncome($period->id);

            // Get retained earnings account
            $accounts = $this->coaService->getStandardAccounts();
            $retainedEarningsCode = $accounts['retained_earnings'] ?? '3200';

            // Close revenue accounts
            $revenueAccounts = ChartOfAccount::where('account_type', 'Revenue')
                ->where('is_active', true)
                ->get();

            $closingEntries = [];

            foreach ($revenueAccounts as $account) {
                $balance = $this->ledgerService->getAccountBalance(
                    $account->account_code,
                    $period->end_date
                );

                if ($balance != 0) {
                    // Debit revenue accounts (to zero them out)
                    $closingEntries[] = [
                        'account_code' => $account->account_code,
                        'entry_type' => 'DEBIT',
                        'amount' => abs($balance),
                        'description' => "Closing entry - {$period->period_name}"
                    ];
                }
            }

            // Close expense accounts
            $expenseAccounts = ChartOfAccount::where('account_type', 'Expense')
                ->where('is_active', true)
                ->get();

            foreach ($expenseAccounts as $account) {
                $balance = $this->ledgerService->getAccountBalance(
                    $account->account_code,
                    $period->end_date
                );

                if ($balance != 0) {
                    // Credit expense accounts (to zero them out)
                    $closingEntries[] = [
                        'account_code' => $account->account_code,
                        'entry_type' => 'CREDIT',
                        'amount' => abs($balance),
                        'description' => "Closing entry - {$period->period_name}"
                    ];
                }
            }

            // Post net income to retained earnings
            if ($netIncome != 0) {
                $closingEntries[] = [
                    'account_code' => $retainedEarningsCode,
                    'entry_type' => $netIncome > 0 ? 'CREDIT' : 'DEBIT',
                    'amount' => abs($netIncome),
                    'description' => "Net income transfer - {$period->period_name}"
                ];
            }

            // Post closing entries
            if (!empty($closingEntries)) {
                $voucherNumber = $this->ledgerService->postTransaction(
                    $closingEntries,
                    'fiscal_periods',
                    $period->id,
                    null,
                    $period->end_date
                );

                $period->update([
                    'closing_voucher_number' => $voucherNumber,
                ]);
            }

            // Mark period as closed
            $period->update([
                'is_closed' => true,
                'closed_at' => now(),
                'closed_by' => auth()->id() ?? session('user_id'),
                'net_income' => $netIncome,
            ]);

            return $this->successResponse([
                'message' => 'Fiscal period closed successfully',
                'net_income' => $netIncome,
                'voucher_number' => $period->closing_voucher_number,
            ]);
        });
    }

    /**
     * Calculate net income for a period
     */
    private function calculatePeriodNetIncome(int $periodId): float
    {
        $period = FiscalPeriod::findOrFail($periodId);

        // Get total revenue
        $revenueAccounts = ChartOfAccount::where('account_type', 'Revenue')
            ->where('is_active', true)
            ->pluck('id');

        $totalRevenue = GeneralLedger::whereIn('account_id', $revenueAccounts)
            ->where('fiscal_period_id', $periodId)
            ->where('is_closed', false)
            ->selectRaw('
                SUM(CASE WHEN entry_type = "CREDIT" THEN amount ELSE 0 END) -
                SUM(CASE WHEN entry_type = "DEBIT" THEN amount ELSE 0 END) as total
            ')
            ->value('total') ?? 0;

        // Get total expenses
        $expenseAccounts = ChartOfAccount::where('account_type', 'Expense')
            ->where('is_active', true)
            ->pluck('id');

        $totalExpenses = GeneralLedger::whereIn('account_id', $expenseAccounts)
            ->where('fiscal_period_id', $periodId)
            ->where('is_closed', false)
            ->selectRaw('
                SUM(CASE WHEN entry_type = "DEBIT" THEN amount ELSE 0 END) -
                SUM(CASE WHEN entry_type = "CREDIT" THEN amount ELSE 0 END) as total
            ')
            ->value('total') ?? 0;

        return (float)$totalRevenue - (float)$totalExpenses;
    }

    /**
     * Lock a fiscal period
     */
    public function lock(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:fiscal_periods,id',
        ]);

        $period = FiscalPeriod::findOrFail($validated['id']);

        if ($period->is_locked) {
            return $this->errorResponse('Period is already locked', 400);
        }

        $period->update([
            'is_locked' => true,
            'locked_at' => now(),
            'locked_by' => auth()->id() ?? session('user_id'),
        ]);

        return $this->successResponse(['message' => 'Fiscal period locked successfully']);
    }

    /**
     * Unlock a fiscal period
     */
    public function unlock(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:fiscal_periods,id',
        ]);

        $period = FiscalPeriod::findOrFail($validated['id']);

        if (!$period->is_locked) {
            return $this->errorResponse('Period is not locked', 400);
        }

        if ($period->is_closed) {
            return $this->errorResponse('Cannot unlock a closed period', 400);
        }

        $period->update([
            'is_locked' => false,
            'locked_at' => null,
            'locked_by' => null,
        ]);

        return $this->successResponse(['message' => 'Fiscal period unlocked successfully']);
    }
}
