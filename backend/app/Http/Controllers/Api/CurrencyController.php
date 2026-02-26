<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\CurrencyDenomination;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurrencyController extends Controller
{
    public function index()
    {
        $currencies = Currency::with('denominations')->get();
        return response()->json([
            'success' => true,
            'data' => $currencies
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:3|unique:currencies,code',
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'exchange_rate' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $currency = Currency::create($request->only(['code', 'name', 'symbol', 'exchange_rate', 'is_active']));
            
            if ($request->has('denominations')) {
                foreach ($request->denominations as $denom) {
                    $currency->denominations()->create($denom);
                }
            }
            
            DB::commit();
            return response()->json(['success' => true, 'data' => $currency->load('denominations')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $currency = Currency::findOrFail($id);
        
        $request->validate([
            'code' => 'required|string|max:3|unique:currencies,code,' . $id,
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'exchange_rate' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $currency->update($request->only(['code', 'name', 'symbol', 'exchange_rate', 'is_active']));

            if ($request->has('denominations')) {
                $currency->denominations()->delete();
                foreach ($request->denominations as $denom) {
                    $currency->denominations()->create($denom);
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'data' => $currency->load('denominations')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $currency = Currency::findOrFail($id);
        if ($currency->is_primary) {
            return response()->json(['success' => false, 'message' => 'Cannot delete primary currency'], 400);
        }
        $currency->delete();
        return response()->json(['success' => true, 'message' => 'Currency deleted']);
    }

    public function toggleActive($id)
    {
         $currency = Currency::findOrFail($id);
         if ($currency->is_primary && $currency->is_active) {
             return response()->json(['success' => false, 'message' => 'Cannot deactivate primary currency'], 400);
         }
         $currency->is_active = !$currency->is_active;
         $currency->save();
         return response()->json(['success' => true, 'data' => $currency]);
    }
}
