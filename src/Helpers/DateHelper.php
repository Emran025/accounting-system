<?php
namespace App\Helpers;

class DateHelper {
    public static function getCurrentTimestamp() {
        return date('Y-m-d H:i:s');
    }

    public static function getFiscalYearStart($year = null) {
        $year = $year ?? date('Y');
        return $year . '-01-01';
    }

    public static function getFiscalYearEnd($year = null) {
        $year = $year ?? date('Y');
        return $year . '-12-31';
    }
}
