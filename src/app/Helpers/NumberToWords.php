<?php

namespace App\Helpers;

/**
 * NumberToWords
 *
 * High-precision, locale-aware number-to-words for invoice totals.
 * - Uses ext-intl `NumberFormatter` as the core engine (required)
 * - Supports high precision (up to 15 integer digits) and 2-decimal subunits
 * - Applies pragmatic Arabic "tamyeez" rules for currency wording suitable for invoices
 * - Produces invoice-style output: "فقط [Text] [Currency] لا غير" (Arabic) and
 *   "Only [Text] [Currency] no more" (English)
 */
class NumberToWords
{
    const MAX_INTEGER_DIGITS = 15; // supports up to 999,999,999,999,999

    /**
     * Convert a numeric value to words following invoice formatting rules.
     *
     * @param string|int|float $number
     * @param string $locale 'ar' or 'en'
     * @param array|null $currency optional override for unit/subunit wording
     * @param int $precision fractional digits (default 2)
     * @return string
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public static function convert($number, $locale = 'ar', $currency = null, $precision = 2)
    {
        // Validate intl presence (core engine requirement)
        if (!class_exists('NumberFormatter')) {
            throw new \RuntimeException("ext-intl (NumberFormatter) is required for NumberToWords conversion.");
        }

        // Normalize input to string for high-precision parsing
        $numStr = (string)$number;
        if (!preg_match('/^-?\d+(?:\.\d+)?$/', $numStr)) {
            throw new \InvalidArgumentException("Number must be a valid numeric string.");
        }

        $lang = substr(strtolower($locale), 0, 2);
        $lang = in_array($lang, ['ar', 'en']) ? $lang : 'ar';

        // Validate integer precision (prevent floating point inaccuracies)
        [$sign, $absStr] = self::extractSign($numStr);
        [$intPart, $fracPart] = self::splitDecimals($absStr, $precision);

        if (strlen($intPart) > self::MAX_INTEGER_DIGITS) {
            throw new \InvalidArgumentException("Integer part exceeds maximum supported digits (" . self::MAX_INTEGER_DIGITS . ").");
        }

        // On 32-bit PHP, very large ints cannot be safely cast; require 64-bit for full support
        if (PHP_INT_SIZE < 8 && strlen($intPart) > 9) {
            throw new \RuntimeException("64-bit PHP is required to safely handle high-precision integer values.");
        }

        // Units default
        $defaults = [
            'ar' => [
                'unit' => ['singular' => 'ريال', 'dual' => 'ريالان', 'plural' => 'ريالات', 'singular_acc' => 'ريالاً'],
                'subunit' => ['singular' => 'هللة', 'plural' => 'هللات', 'singular_acc' => 'هللة'],
            ],
            'en' => [
                'unit' => ['singular' => 'Riyal', 'plural' => 'Riyals'],
                'subunit' => ['singular' => 'Halala', 'plural' => 'Halalas'],
            ],
        ];
        $units = $currency ?: $defaults[$lang];

        // Round fractional part to requested precision using string arithmetic
        [$intPart, $fracPart] = self::roundStringNumber($intPart, $fracPart, $precision);

        // Convert to integers safe for NumberFormatter (we ensured they fit)
        $intVal = (int)$intPart;
        $fracVal = (int)$fracPart;

        // Prepare NumberFormatter
        $fmt = new \NumberFormatter($lang === 'ar' ? 'ar' : 'en', \NumberFormatter::SPELLOUT);

        // Integer words
        $intWords = $fmt->format($intVal);
        if ($intWords === false || $intWords === null) {
            $intWords = ($lang === 'ar') ? 'صفر' : 'zero';
        }

        // Determine currency unit form
        if ($lang === 'ar') {
            $unitWord = self::arabicCurrencyForm((string)$intPart, $units['unit']);
            // Fraction words (use Arabic tamyeez logic for subunit form too)
            if ($fracVal > 0) {
                $fracWords = $fmt->format($fracVal);
                if ($fracWords === false || $fracWords === null) {
                    $fracWords = (string)$fracVal;
                }
                // Normalize subunit descriptor for arabicCurrencyForm
                $subUnitSpec = $units['subunit'];
                $subUnitSpecNorm = [
                    'singular' => $subUnitSpec['singular'] ?? '',
                    'dual' => $subUnitSpec['dual'] ?? ($subUnitSpec['singular'] ?? '') . 'ان',
                    'plural' => $subUnitSpec['plural'] ?? ($subUnitSpec['singular'] ?? ''),
                    'singular_acc' => $subUnitSpec['singular_acc'] ?? ($subUnitSpec['singular'] ?? ''),
                ];
                $subWord = self::arabicCurrencyForm((string)$fracVal, $subUnitSpecNorm);
                $body = trim($intWords . ' ' . $unitWord . ' و ' . $fracWords . ' ' . $subWord);
            } else {
                $body = trim($intWords . ' ' . $unitWord);
            }
            // Invoice format
            return trim(($sign === '-' ? 'سالب ' : '') . 'فقط ' . $body . ' لا غير');
        }

        // English
        $unitWord = ((int)$intPart == 1) ? $units['unit']['singular'] : $units['unit']['plural'];
        if ($fracVal > 0) {
            $fracWords = $fmt->format($fracVal);
            if ($fracWords === false || $fracWords === null) {
                $fracWords = (string)$fracVal;
            }
            $subWord = ($fracVal == 1) ? $units['subunit']['singular'] : $units['subunit']['plural'];
            $body = trim(ucfirst($intWords) . ' ' . $unitWord . ' and ' . $fracWords . ' ' . $subWord);
        } else {
            $body = trim(ucfirst($intWords) . ' ' . $unitWord);
        }

        return trim(($sign === '-' ? 'minus ' : '') . 'Only ' . $body . ' no more');
    }

    /**
     * Return arabic currency form following tamyeez rules described.
     *
     * Tamyeez rules (pragmatic, invoice-focused):
     * - 0 -> use singular (e.g., "صفر ريال")
     * - multiples of 100 (100, 200, 1000, etc.) -> singular (e.g., "مائة ريال")
     * - 1 -> singular (e.g., "ريال")
     * - 2 -> dual (e.g., "ريالان")
     * - 3..10 -> plural (e.g., "ريالات")
     * - 11..99 -> singular accusative (e.g., "ريالاً")
     */
    protected static function arabicCurrencyForm(string $intPart, array $unit): string
    {
        $n = (int)$intPart;
        if ($n === 0) {
            return $unit['singular'];
        }
        if ($n % 100 === 0) {
            return $unit['singular'];
        }
        if ($n === 1) {
            return $unit['singular'];
        }
        if ($n === 2) {
            return $unit['dual'];
        }
        $lastTwo = $n % 100;
        if ($lastTwo >= 3 && $lastTwo <= 10) {
            return $unit['plural'];
        }
        if ($lastTwo >= 11 && $lastTwo <= 99) {
            return $unit['singular_acc'] ?? $unit['singular'];
        }
        return $unit['singular'];
    }

    protected static function extractSign(string $numStr): array
    {
        if ($numStr[0] === '-') {
            return ['-', substr($numStr, 1)];
        }
        return ['', $numStr];
    }

    protected static function splitDecimals(string $absStr, int $precision): array
    {
        if (strpos($absStr, '.') === false) {
            return [$absStr, str_repeat('0', $precision)];
        }
        [$i, $f] = explode('.', $absStr, 2);
        return [$i === '' ? '0' : $i, rtrim($f, '0')];
    }

    protected static function roundStringNumber(string $intPart, string $fracPart, int $precision): array
    {
        $f = $fracPart === '' ? str_repeat('0', $precision + 1) : $fracPart . str_repeat('0', $precision + 1 - strlen($fracPart));
        $roundDigit = (int)($f[$precision] ?? 0);
        $target = substr($f, 0, $precision);

        if ($roundDigit >= 5) {
            $carry = 1;
            $t = $target;
            $len = strlen($t);
            for ($i = $len - 1; $i >= 0; $i--) {
                $d = (int)$t[$i] + $carry;
                if ($d >= 10) {
                    $t[$i] = (string)($d - 10);
                    $carry = 1;
                } else {
                    $t[$i] = (string)$d;
                    $carry = 0;
                    break;
                }
            }
            if ($carry === 1) {
                $intPart = (string)((int)$intPart + 1);
                $t = str_repeat('0', $precision);
            }
            $target = $t;
        } else {
            $target = str_pad(substr($target, 0, $precision), $precision, '0');
        }

        return [$intPart, $target];
    }
}

