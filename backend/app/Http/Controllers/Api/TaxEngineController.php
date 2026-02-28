<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaxAuthority;
use App\Models\TaxType;
use App\Models\TaxRate;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Api\BaseApiController;

class TaxEngineController extends Controller
{
    use BaseApiController;

    /**
     * Get the full unified tax setup including Authorities, Types, and their default rates.
     */
    public function getSetup(): JsonResponse
    {
        $authorities = TaxAuthority::with(['taxTypes.taxRates' => function ($q) {
            $q->where('is_default', true)->orWhere('effective_to', null);
        }])->get();

        return $this->successResponse(['authorities' => $authorities]);
    }

    /**
     * Update Tax Authority (e.g. ZATCA connection credentials & policies)
     */
    public function updateAuthority(Request $request, $id): JsonResponse
    {
        $authority = TaxAuthority::findOrFail($id);
        
        $data = $request->validate([
            'is_active' => 'boolean',
            'is_primary' => 'boolean',
            'connection_type' => 'nullable|string',
            'endpoint_url' => 'nullable|string',
            'connection_credentials' => 'nullable|string',
            'config' => 'nullable|array',
        ]);

        // If credentials are provided and we are using an API approach
        if (isset($data['connection_credentials']) && !empty($data['connection_credentials'])) {
             // In a real app, this would be encrypted
        }

        $authority->update($data);

        return $this->successResponse(['authority' => $authority], 'Tax Authority updated successfully.');
    }

    /**
     * Create a new Tax Type (e.g., a specific Government Fee or Obligation)
     */
    public function storeTaxType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tax_authority_id' => 'required|exists:tax_authorities,id',
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:tax_types,code', // e.g. GOV_FEE_1
            'gl_account_code' => 'nullable|string|max:20',
            'calculation_type' => 'required|string|in:percentage,fixed_amount',
            'applicable_areas' => 'nullable|array',
            'is_active' => 'boolean',
            
            // Rate info for convenience
            'rate' => 'nullable|numeric',
            'fixed_amount' => 'nullable|numeric',
        ]);

        $data['applicable_areas'] = isset($data['applicable_areas']) ? json_encode($data['applicable_areas']) : json_encode(['sales']);

        $taxType = TaxType::create($data);

        // Auto-create default active rate
        TaxRate::create([
            'tax_type_id' => $taxType->id,
            'rate' => $data['rate'] ?? 0,
            'fixed_amount' => $data['fixed_amount'] ?? 0,
            'effective_from' => now()->format('Y-m-d'),
            'is_default' => true,
        ]);

        return $this->successResponse(['tax_type' => $taxType->load('taxRates')], 'Tax Type created successfully.');
    }

    /**
     * Update a Tax Type conceptually (updates rate if passed)
     */
    public function updateTaxType(Request $request, $id): JsonResponse
    {
        $taxType = TaxType::findOrFail($id);
        
        $data = $request->validate([
            'name' => 'string|max:100',
            'gl_account_code' => 'nullable|string|max:20',
            'calculation_type' => 'string|in:percentage,fixed_amount',
            'applicable_areas' => 'nullable|array',
            'is_active' => 'boolean',
            
            // Rate info
            'rate' => 'nullable|numeric',
            'fixed_amount' => 'nullable|numeric',
        ]);

        if (array_key_exists('applicable_areas', $data)) {
            $data['applicable_areas'] = json_encode($data['applicable_areas']);
        }

        $taxType->update($data);

        if (isset($data['rate']) || isset($data['fixed_amount'])) {
            // Update the default rate or create a new effective one
            $defaultRate = $taxType->taxRates()->where('is_default', true)->first();
            if ($defaultRate) {
                $defaultRate->update([
                    'rate' => $data['rate'] ?? $defaultRate->rate,
                    'fixed_amount' => $data['fixed_amount'] ?? $defaultRate->fixed_amount,
                ]);
            }
        }

        return $this->successResponse(['tax_type' => $taxType->load('taxRates')], 'Tax Type updated successfully.');
    }

    /**
     * Delete a Tax Type
     */
    public function destroyTaxType($id): JsonResponse
    {
        $taxType = TaxType::findOrFail($id);
        $taxType->delete();

        return $this->successResponse([], 'Tax Type deleted successfully.');
    }
}
