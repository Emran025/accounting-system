<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CurrencyPolicy;
use App\Models\CurrencyExchangeRateHistory;
use App\Services\CurrencyPolicyService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Currency Policy Controller
 * 
 * API endpoints for managing currency policies and exchange rates
 * as defined in the Multi-Currency Architecture framework.
 */
class CurrencyPolicyController extends Controller
{
    private CurrencyPolicyService $policyService;

    public function __construct(CurrencyPolicyService $policyService)
    {
        $this->policyService = $policyService;
    }

    /**
     * Get all currency policies
     */
    public function index(): JsonResponse
    {
        $policies = CurrencyPolicy::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $policies,
        ]);
    }

    /**
     * Get the currently active policy with status
     */
    public function getActivePolicy(): JsonResponse
    {
        $status = $this->policyService->getPolicyStatus();

        return response()->json([
            'success' => true,
            'data' => $status,
        ]);
    }

    /**
     * Create a new currency policy
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:currency_policies,name',
            'code' => 'required|string|max:20|unique:currency_policies,code',
            'description' => 'nullable|string',
            'policy_type' => ['required', Rule::in(['UNIT_OF_MEASURE', 'VALUED_ASSET', 'NORMALIZATION'])],
            'requires_reference_currency' => 'boolean',
            'allow_multi_currency_balances' => 'boolean',
            'conversion_timing' => ['required', Rule::in(['POSTING', 'SETTLEMENT', 'REPORTING', 'NEVER'])],
            'revaluation_enabled' => 'boolean',
            'revaluation_frequency' => ['nullable', Rule::in(['DAILY', 'WEEKLY', 'MONTHLY', 'PERIOD_END'])],
            'exchange_rate_source' => ['nullable', Rule::in(['MANUAL', 'CENTRAL_BANK', 'API'])],
            'is_active' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            // If setting as active, deactivate others
            if ($validated['is_active'] ?? false) {
                CurrencyPolicy::query()->update(['is_active' => false]);
            }

            $policy = CurrencyPolicy::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Currency policy created successfully',
                'data' => $policy,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific currency policy
     */
    public function show(int $id): JsonResponse
    {
        $policy = CurrencyPolicy::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $policy,
        ]);
    }

    /**
     * Update a currency policy
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $policy = CurrencyPolicy::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('currency_policies', 'name')->ignore($id)],
            'code' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('currency_policies', 'code')->ignore($id)],
            'description' => 'nullable|string',
            'policy_type' => ['sometimes', Rule::in(['UNIT_OF_MEASURE', 'VALUED_ASSET', 'NORMALIZATION'])],
            'requires_reference_currency' => 'boolean',
            'allow_multi_currency_balances' => 'boolean',
            'conversion_timing' => ['sometimes', Rule::in(['POSTING', 'SETTLEMENT', 'REPORTING', 'NEVER'])],
            'revaluation_enabled' => 'boolean',
            'revaluation_frequency' => ['nullable', Rule::in(['DAILY', 'WEEKLY', 'MONTHLY', 'PERIOD_END'])],
            'exchange_rate_source' => ['nullable', Rule::in(['MANUAL', 'CENTRAL_BANK', 'API'])],
        ]);

        $policy->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Currency policy updated successfully',
            'data' => $policy->fresh(),
        ]);
    }

    /**
     * Activate a currency policy
     */
    public function activate(int $id): JsonResponse
    {
        $policy = CurrencyPolicy::findOrFail($id);
        $policy->activate();

        return response()->json([
            'success' => true,
            'message' => 'Currency policy activated successfully',
            'data' => $policy->fresh(),
        ]);
    }

    /**
     * Delete a currency policy
     */
    public function destroy(int $id): JsonResponse
    {
        $policy = CurrencyPolicy::findOrFail($id);

        if ($policy->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete the active policy. Please activate another policy first.',
            ], 400);
        }

        // Check if policy has transactions
        if ($policy->transactionContexts()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete policy with existing transaction contexts. Historical integrity must be preserved.',
            ], 400);
        }

        $policy->delete();

        return response()->json([
            'success' => true,
            'message' => 'Currency policy deleted successfully',
        ]);
    }

    /**
     * Get exchange rate history
     */
    public function getExchangeRateHistory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'currency_id' => 'nullable|exists:currencies,id',
            'target_currency_id' => 'nullable|exists:currencies,id',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'limit' => 'nullable|integer|min:1|max:500',
        ]);

        $query = CurrencyExchangeRateHistory::with(['currency', 'targetCurrency', 'createdBy']);

        if (isset($validated['currency_id'])) {
            $query->where('currency_id', $validated['currency_id']);
        }

        if (isset($validated['target_currency_id'])) {
            $query->where('target_currency_id', $validated['target_currency_id']);
        }

        if (isset($validated['from_date'])) {
            $query->where('effective_date', '>=', $validated['from_date']);
        }

        if (isset($validated['to_date'])) {
            $query->where('effective_date', '<=', $validated['to_date']);
        }

        $rates = $query->orderBy('effective_date', 'desc')
            ->orderBy('effective_time', 'desc')
            ->limit($validated['limit'] ?? 100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rates,
        ]);
    }

    /**
     * Record a new exchange rate
     */
    public function recordExchangeRate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'currency_id' => 'required|exists:currencies,id',
            'target_currency_id' => 'required|exists:currencies,id|different:currency_id',
            'exchange_rate' => 'required|numeric|min:0.00000001',
            'effective_date' => 'nullable|date',
            'source' => ['nullable', Rule::in(['MANUAL', 'CENTRAL_BANK', 'API'])],
            'source_reference' => 'nullable|string|max:255',
        ]);

        try {
            $rate = $this->policyService->recordExchangeRate(
                $validated['currency_id'],
                $validated['target_currency_id'],
                $validated['exchange_rate'],
                $validated['effective_date'] ?? null,
                $validated['source'] ?? 'MANUAL',
                $validated['source_reference'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Exchange rate recorded successfully',
                'data' => $rate->load(['currency', 'targetCurrency']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current exchange rate for a currency pair
     */
    public function getExchangeRate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_currency_id' => 'required|exists:currencies,id',
            'target_currency_id' => 'required|exists:currencies,id',
            'date' => 'nullable|date',
        ]);

        $rate = $this->policyService->getExchangeRate(
            $validated['source_currency_id'],
            $validated['target_currency_id'],
            $validated['date'] ?? null
        );

        if ($rate === null) {
            return response()->json([
                'success' => false,
                'message' => 'No exchange rate available for this currency pair',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'source_currency_id' => $validated['source_currency_id'],
                'target_currency_id' => $validated['target_currency_id'],
                'rate' => $rate,
                'date' => $validated['date'] ?? now()->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Convert an amount
     */
    public function convert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'source_currency_id' => 'required|exists:currencies,id',
            'target_currency_id' => 'required|exists:currencies,id',
            'date' => 'nullable|date',
        ]);

        try {
            $result = $this->policyService->convert(
                $validated['amount'],
                $validated['source_currency_id'],
                $validated['target_currency_id'],
                $validated['date'] ?? null
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'original_amount' => $validated['amount'],
                    'converted_amount' => $result['amount'],
                    'exchange_rate' => $result['rate'],
                    'source_currency_id' => $validated['source_currency_id'],
                    'target_currency_id' => $validated['target_currency_id'],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Process revaluation for a currency
     */
    public function processRevaluation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'currency_id' => 'required|exists:currencies,id',
            'new_rate' => 'required|numeric|min:0.00000001',
            'fiscal_period_id' => 'nullable|exists:fiscal_periods,id',
        ]);

        try {
            $result = $this->policyService->processRevaluation(
                $validated['currency_id'],
                $validated['new_rate'],
                $validated['fiscal_period_id'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Revaluation processed successfully',
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get available policy types for dropdown
     */
    public function getPolicyTypes(): JsonResponse
    {
        $types = [
            [
                'value' => 'UNIT_OF_MEASURE',
                'label' => 'Unit of Measure (Non-Converted)',
                'label_ar' => 'وحدة قياس (بدون تحويل)',
                'description' => 'Currencies are stored in their native denomination. No conversion occurs at posting.',
            ],
            [
                'value' => 'VALUED_ASSET',
                'label' => 'Valued Asset (Conditionally Convertible)',
                'label_ar' => 'أصل مُقيَّم (قابل للتحويل اختياريًا)',
                'description' => 'Currencies are tracked in original amounts with optional revaluation.',
            ],
            [
                'value' => 'NORMALIZATION',
                'label' => 'Normalization (Immediate Conversion)',
                'label_ar' => 'توحيد العملة (تحويل فوري)',
                'description' => 'All transactions are immediately converted to the reference currency.',
            ],
        ];

        $timings = [
            ['value' => 'POSTING', 'label' => 'At Posting', 'label_ar' => 'عند الترحيل'],
            ['value' => 'SETTLEMENT', 'label' => 'At Settlement', 'label_ar' => 'عند التسوية'],
            ['value' => 'REPORTING', 'label' => 'For Reporting Only', 'label_ar' => 'للتقارير فقط'],
            ['value' => 'NEVER', 'label' => 'Never', 'label_ar' => 'لا يتم التحويل'],
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'policy_types' => $types,
                'conversion_timings' => $timings,
            ],
        ]);
    }
}
