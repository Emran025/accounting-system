<?php

namespace Tests\Unit\Helpers;

use Tests\TestCase;
use App\Helpers\DateHelper;
use Illuminate\Support\Carbon;

class DateHelperTest extends TestCase
{
    public function test_get_current_timestamp_format()
    {
        Carbon::setTestNow('2023-01-01 12:00:00');
        $this->assertEquals('2023-01-01 12:00:00', DateHelper::getCurrentTimestamp());
    }

    public function test_get_fiscal_year_start()
    {
        Carbon::setTestNow('2023-06-15');
        $this->assertEquals('2023-01-01', DateHelper::getFiscalYearStart());
        $this->assertEquals('2022-01-01', DateHelper::getFiscalYearStart(2022));
    }

    public function test_get_fiscal_year_end()
    {
        Carbon::setTestNow('2023-06-15');
        $this->assertEquals('2023-12-31', DateHelper::getFiscalYearEnd());
        $this->assertEquals('2022-12-31', DateHelper::getFiscalYearEnd(2022));
    }
}
