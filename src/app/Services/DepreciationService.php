<?php

namespace App\Services;

use App\Models\Asset;
use App\Services\LedgerService;
use App\Services\ChartOfAccountsMappingService;
use Illuminate\Support\Facades\DB;

class DepreciationService
{
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
     * Calculate depreciation for an asset
     * 
     * @param int $assetId Asset ID
     * @param string $method Depreciation method (straight_line, declining_balance, units_of_production)
     * @param string|null $asOfDate Date to calculate depreciation as of
     * @return float Depreciation amount
     */
    public function calculateDepreciation(
        int $assetId,
        string $method = 'straight_line',
        ?string $asOfDate = null
    ): float {
        $asset = Asset::findOrFail($assetId);
        
        if (!$asOfDate) {
            $asOfDate = now()->format('Y-m-d');
        }

        $purchaseDate = $asset->purchase_date;
        $purchaseValue = (float)$asset->purchase_value;
        $salvageValue = (float)($asset->salvage_value ?? 0);
        $usefulLife = (int)($asset->useful_life_years ?? 5);
        $accumulatedDepreciation = (float)($asset->accumulated_depreciation ?? 0);

        $depreciableAmount = $purchaseValue - $salvageValue;

        switch ($method) {
            case 'straight_line':
                return $this->calculateStraightLine(
                    $depreciableAmount,
                    $usefulLife,
                    $purchaseDate,
                    $asOfDate
                );

            case 'declining_balance':
                $rate = (float)($asset->depreciation_rate ?? 20); // Default 20%
                return $this->calculateDecliningBalance(
                    $purchaseValue,
                    $accumulatedDepreciation,
                    $rate,
                    $purchaseDate,
                    $asOfDate
                );

            case 'units_of_production':
                $totalUnits = (float)($asset->total_units ?? 1);
                $unitsUsed = (float)($asset->units_used ?? 0);
                return $this->calculateUnitsOfProduction(
                    $depreciableAmount,
                    $totalUnits,
                    $unitsUsed
                );

            default:
                return $this->calculateStraightLine(
                    $depreciableAmount,
                    $usefulLife,
                    $purchaseDate,
                    $asOfDate
                );
        }
    }

    /**
     * Straight-line depreciation
     */
    private function calculateStraightLine(
        float $depreciableAmount,
        int $usefulLifeYears,
        string $purchaseDate,
        string $asOfDate
    ): float {
        if ($usefulLifeYears <= 0) {
            return 0;
        }

        $annualDepreciation = $depreciableAmount / $usefulLifeYears;
        
        // Calculate months elapsed
        $start = new \DateTime($purchaseDate);
        $end = new \DateTime($asOfDate);
        $interval = $start->diff($end);
        $monthsElapsed = ($interval->y * 12) + $interval->m;

        // Monthly depreciation
        $monthlyDepreciation = $annualDepreciation / 12;
        
        return $monthlyDepreciation * $monthsElapsed;
    }

    /**
     * Declining balance depreciation
     */
    private function calculateDecliningBalance(
        float $purchaseValue,
        float $accumulatedDepreciation,
        float $rate,
        string $purchaseDate,
        string $asOfDate
    ): float {
        $bookValue = $purchaseValue - $accumulatedDepreciation;
        $annualDepreciation = $bookValue * ($rate / 100);

        // Calculate months elapsed since last depreciation
        $start = new \DateTime($purchaseDate);
        $end = new \DateTime($asOfDate);
        $interval = $start->diff($end);
        $monthsElapsed = ($interval->y * 12) + $interval->m;

        $monthlyDepreciation = $annualDepreciation / 12;
        
        return $monthlyDepreciation * $monthsElapsed;
    }

    /**
     * Units of production depreciation
     */
    private function calculateUnitsOfProduction(
        float $depreciableAmount,
        float $totalUnits,
        float $unitsUsed
    ): float {
        if ($totalUnits <= 0) {
            return 0;
        }

        $perUnitDepreciation = $depreciableAmount / $totalUnits;
        return $perUnitDepreciation * $unitsUsed;
    }

    /**
     * Post depreciation entry to General Ledger
     * 
     * @param int $assetId Asset ID
     * @param float $amount Depreciation amount
     * @param string $date Depreciation date
     * @return string Voucher number
     */
    public function postDepreciationEntry(
        int $assetId,
        float $amount,
        string $date
    ): string {
        $asset = Asset::findOrFail($assetId);
        $accounts = $this->coaService->getStandardAccounts();

        $glEntries = [
            [
                'account_code' => $accounts['depreciation_expense'] ?? '6200',
                'entry_type' => 'DEBIT',
                'amount' => $amount,
                'description' => "Depreciation - {$asset->name}"

            ],
            [
                'account_code' => $accounts['accumulated_depreciation'] ?? '1290',
                'entry_type' => 'CREDIT',
                'amount' => $amount,
                'description' => "Accumulated Depreciation - {$asset->name}"

            ],
        ];

        $voucherNumber = $this->ledgerService->postTransaction(
            $glEntries,
            'assets',
            $assetId,
            null,
            $date
        );

        // Update asset's accumulated depreciation
        $asset->increment('accumulated_depreciation', $amount);

        return $voucherNumber;
    }

    /**
     * Get depreciation schedule for an asset
     * 
     * @param int $assetId Asset ID
     * @param string $method Depreciation method
     * @return array Depreciation schedule
     */
    public function getDepreciationSchedule(
        int $assetId,
        string $method = 'straight_line'
    ): array {
        $asset = Asset::findOrFail($assetId);
        
        $purchaseValue = (float)$asset->purchase_value;
        $salvageValue = (float)($asset->salvage_value ?? 0);
        $usefulLife = (int)($asset->useful_life_years ?? 5);
        $purchaseDate = new \DateTime($asset->purchase_date);

        $depreciableAmount = $purchaseValue - $salvageValue;
        $annualDepreciation = $usefulLife > 0 ? $depreciableAmount / $usefulLife : 0;

        $schedule = [];
        $accumulatedDepreciation = 0;

        for ($year = 1; $year <= $usefulLife; $year++) {
            $yearDate = clone $purchaseDate;
            $yearDate->modify("+{$year} year");

            if ($method === 'straight_line') {
                $depreciation = $annualDepreciation;
            } elseif ($method === 'declining_balance') {
                $rate = (float)($asset->depreciation_rate ?? 20);
                $bookValue = $purchaseValue - $accumulatedDepreciation;
                $depreciation = $bookValue * ($rate / 100);
            } else {
                $depreciation = $annualDepreciation;
            }

            $accumulatedDepreciation += $depreciation;
            $bookValue = $purchaseValue - $accumulatedDepreciation;

            $schedule[] = [
                'year' => $year,
                'date' => $yearDate->format('Y-m-d'),
                'depreciation' => round($depreciation, 2),
                'accumulated_depreciation' => round($accumulatedDepreciation, 2),
                'book_value' => round($bookValue, 2),
            ];
        }

        return $schedule;
    }

    /**
     * Process depreciation for all assets for a given period
     * 
     * @param string $periodStart Period start date
     * @param string $periodEnd Period end date
     * @return array Results of depreciation processing
     */
    public function processPeriodicDepreciation(
        string $periodStart,
        string $periodEnd
    ): array {
        $assets = Asset::where('is_active', true)
            ->where('purchase_date', '<=', $periodEnd)
            ->get();

        $results = [];

        foreach ($assets as $asset) {
            try {
                $method = $asset->depreciation_method ?? 'straight_line';
                $amount = $this->calculateDepreciation($asset->id, $method, $periodEnd);

                if ($amount > 0) {
                    $voucherNumber = $this->postDepreciationEntry(
                        $asset->id,
                        $amount,
                        $periodEnd
                    );

                    $results[] = [
                        'asset_id' => $asset->id,
                        'asset_name' => $asset->name,

                        'amount' => $amount,
                        'voucher_number' => $voucherNumber,
                        'status' => 'success',
                    ];
                }
            } catch (\Exception $e) {
                $results[] = [
                    'asset_id' => $asset->id,
                    'asset_name' => $asset->name,

                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }
}
