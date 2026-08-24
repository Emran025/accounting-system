<?php

namespace App\Domains\EnterpriseCore\DesktopDistribution\Services;

use Illuminate\Validation\ValidationException;

class TransportSecurityPolicy
{
    private const MODES = ['disabled', 'observe', 'prefer-sealed', 'require-sealed'];

    public function mode(): string
    {
        $mode = (string) config('transport_security.mode');
        if (! in_array($mode, self::MODES, true)) {
            throw ValidationException::withMessages([
                'transport_security' => ['The configured transport security mode is invalid.'],
            ]);
        }

        return $mode;
    }

    public function isEnabledForNegotiation(): bool
    {
        return $this->mode() !== 'disabled';
    }

    /** @return array{protocol:string,mode:string,key_algorithm:string,maximum_envelope_bytes:int} */
    public function publicCapability(): array
    {
        return [
            'protocol' => (string) config('transport_security.protocol'),
            'mode' => $this->mode(),
            'key_algorithm' => (string) config('transport_security.key_algorithm'),
            'maximum_envelope_bytes' => (int) config('transport_security.maximum_envelope_bytes'),
        ];
    }
}
