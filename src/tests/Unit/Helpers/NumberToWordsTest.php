<?php

namespace Tests\Unit\Helpers;

use Tests\TestCase;
use App\Helpers\NumberToWords;

class NumberToWordsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (!class_exists(\NumberFormatter::class)) {
            $this->markTestSkipped('The intl extension is not installed/enabled. NumberToWords tests skipped.');
        }
    }

    public function test_convert_arabic_defaults()
    {
        $this->assertEquals(
            'فقط مائة ريال لا غير',
            NumberToWords::convert(100, 'ar')
        );
    }

    public function test_convert_english_defaults()
    {
        $this->assertEquals(
            'Only One hundred Riyals no more',
            NumberToWords::convert(100, 'en')
        );
    }

    public function test_convert_decimal_arabic()
    {
        $this->assertEquals(
            'فقط عشرة ريالات و خمسون هللة لا غير',
            NumberToWords::convert(10.50, 'ar')
        );
    }

    public function test_convert_decimal_english()
    {
        $this->assertEquals(
            'Only Ten Riyals and Fifty Halalas no more',
            NumberToWords::convert(10.50, 'en')
        );
    }

    public function test_integer_zero_arabic()
    {
        // 0 riyals -> "فقط ريال لا غير" based on code: if n=0 return singular.
        // Let's check code logic: 
        // if n=0 return unit['singular'] -> 'ريال'
        // Body: 'صفر ريال' because intWords is 'صفر'
        // Wait, line 140: arabicCurrencyForm(0) -> returns singular 'ريال'
        // Line 84: intWords = 'صفر'
        // Line 107: body = 'صفر ريال'
        // Result: 'فقط صفر ريال لا غير'
        
        $this->assertEquals(
            'فقط صفر ريال لا غير',
            NumberToWords::convert(0, 'ar')
        );
    }

    public function test_tamyeez_rules_arabic()
    {
        // 1: ريال
        $this->assertEquals('فقط واحد ريال لا غير', NumberToWords::convert(1, 'ar'));
        
        // 2: ريالان (Accepts both with and without Hamza)
        $this->assertMatchesRegularExpression('/فقط (اثنان|إثنان) ريالان لا غير/', NumberToWords::convert(2, 'ar'));
        
        // 3-10: ريالات (plural)
        $this->assertEquals('فقط ثلاثة ريالات لا غير', NumberToWords::convert(3, 'ar'));
        $this->assertEquals('فقط عشرة ريالات لا غير', NumberToWords::convert(10, 'ar'));
        
        // 11-99: ريالاً (singular acc)
        // 11 usually 'أحد عشر' but allow no hamza just in case
        $this->assertMatchesRegularExpression('/فقط (أحد|احد) عشر ريالاً لا غير/', NumberToWords::convert(11, 'ar'));
        $this->assertEquals('فقط تسعة وتسعون ريالاً لا غير', NumberToWords::convert(99, 'ar'));
        
        // 100: مائة ريال (singular)
        // Some libraries return 'مئة'
        $this->assertMatchesRegularExpression('/فقط (مائة|مئة) ريال لا غير/', NumberToWords::convert(100, 'ar'));
    }
    
    public function test_negative_numbers()
    {
        $this->assertEquals(
            'سالب فقط مائة ريال لا غير',
            NumberToWords::convert(-100, 'ar')
        );
        
        $this->assertEquals(
            'minus Only One hundred Riyals no more',
            NumberToWords::convert(-100, 'en')
        );
    }

    public function test_throws_exception_on_invalid_input()
    {
        $this->expectException(\InvalidArgumentException::class);
        NumberToWords::convert('invalid');
    }

    public function test_throws_exception_on_large_integer()
    {
        $this->expectException(\InvalidArgumentException::class);
        // Force a mock check or just rely on MAX_INTEGER_DIGITS logic if we can bypass it
        // The code checks PHP_INT_SIZE < 8.
        // We can just test the MAX_INTEGER_DIGITS check
        NumberToWords::convert('10000000000000000'); // 17 digits
    }
}
