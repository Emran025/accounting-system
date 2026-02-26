<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Revenue;
use App\Services\PermissionService;
use App\Services\TelescopeService;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\BaseApiController;

class RevenuesController extends Controller
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

    public function index(Request $request): JsonResponse
    {


        $page = max(1, (int)$request->input('page', 1));
        $perPage = min(100, max(1, (int)$request->input('per_page', 20)));

        $query = Revenue::with('user');

        $total = $query->count();
        $revenues = $query->orderBy('revenue_date', 'desc')
            ->skip(($page - 1) * $perPage)
            ->take($perPage)
            ->get();

        return $this->paginatedResponse($revenues, $total, $page, $perPage);
    }

    public function store(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'source' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'revenue_date' => 'nullable|date',
            'description' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $revenue = Revenue::create([
                'source' => $validated['source'],
                'amount' => $validated['amount'],
                'revenue_date' => $validated['revenue_date'] ?? now(),
                'description' => $validated['description'] ?? null,
                'user_id' => auth()->id() ?? session('user_id'),
            ]);

            // Generate voucher number
            $voucherNumber = $this->ledgerService->getNextVoucherNumber('REV');

            // Post to GL
            $accounts = $this->coaService->getStandardAccounts();
            $glEntries = [
                [
                    'account_code' => $accounts['cash'],
                    'entry_type' => 'DEBIT',
                    'amount' => $revenue->amount,
                    'description' => "Revenue: {$revenue->source} - Voucher #$voucherNumber"
                ],
                [
                    'account_code' => $accounts['other_revenue'],
                    'entry_type' => 'CREDIT',
                    'amount' => $revenue->amount,
                    'description' => "Other Revenue - Voucher #$voucherNumber"
                ],
            ];

            $this->ledgerService->postTransaction(
                $glEntries,
                'revenues',
                $revenue->id,
                $voucherNumber,
                $revenue->revenue_date->format('Y-m-d')
            );

            TelescopeService::logOperation('CREATE', 'revenues', $revenue->id, null, $validated);

            return $this->successResponse([
                'id' => $revenue->id,
                'voucher_number' => $voucherNumber,
            ]);
        });
    }

    public function update(Request $request): JsonResponse
    {


        $validated = $request->validate([
            'id' => 'required|exists:revenues,id',
            'source' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'revenue_date' => 'nullable|date',
            'description' => 'nullable|string',
        ]);

        $revenue = Revenue::findOrFail($validated['id']);
        $oldValues = $revenue->toArray();
        $revenue->update($validated);

        TelescopeService::logOperation('UPDATE', 'revenues', $revenue->id, $oldValues, $validated);

        return $this->successResponse();
    }

    public function destroy(Request $request): JsonResponse
    {


        $id = $request->input('id');
        $revenue = Revenue::findOrFail($id);
        $oldValues = $revenue->toArray();
        $revenue->delete();

        TelescopeService::logOperation('DELETE', 'revenues', $id, $oldValues, null);

        return $this->successResponse();
    }
}
