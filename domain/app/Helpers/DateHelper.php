<?php

namespace App\Helpers;

use Carbon\Carbon;

class DateHelper
{
    public static function getCurrentTimestamp(): string
    {
        return now()->format('Y-m-d H:i:s');
    }

    public static function getFiscalYearStart(?int $year = null): string
    {
        $year = $year ?? now()->year;
        return "$year-01-01";
    }

    public static function getFiscalYearEnd(?int $year = null): string
    {
        $year = $year ?? now()->year;
        return "$year-12-31";
    }
}

