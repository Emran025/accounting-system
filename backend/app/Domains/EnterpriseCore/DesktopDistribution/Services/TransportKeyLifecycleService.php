<?php

namespace App\Domains\EnterpriseCore\DesktopDistribution\Services;

use App\Domains\EnterpriseCore\DesktopDistribution\Models\DesktopDevice;
use App\Domains\EnterpriseCore\DesktopDistribution\Models\DesktopDeviceTransportKey;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransportKeyLifecycleService
{
    public const X25519_XSALSA20POLY1305 = 'x25519-xsalsa20poly1305';

    /**
     * Registers a public device key and retires an existing active key only
     * after the successor was fully validated. The transaction guarantees that
     * a device never has a key gap because of a malformed rotation request.
     */
    public function registerDeviceKey(
        DesktopDevice $device,
        string $keyId,
        string $algorithm,
        string $encodedPublicKey,
        ?\DateTimeInterface $retireExistingAfter = null,
    ): DesktopDeviceTransportKey {
        $this->assertKeyIdentifier($keyId);
        $this->assertAlgorithm($algorithm);
        $publicKey = $this->decodePublicKey($encodedPublicKey);
        $fingerprint = hash('sha256', $publicKey);

        return DB::transaction(function () use ($device, $keyId, $algorithm, $encodedPublicKey, $fingerprint, $retireExistingAfter): DesktopDeviceTransportKey {
            $existing = DesktopDeviceTransportKey::query()
                ->where('key_id', $keyId)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                if ($existing->desktop_device_id !== $device->id || ! hash_equals($existing->public_key_fingerprint, $fingerprint)) {
                    throw ValidationException::withMessages([
                        'transport_key_id' => ['The transport key identifier is already bound to another key.'],
                    ]);
                }

                return $existing;
            }

            $key = DesktopDeviceTransportKey::query()->create([
                'desktop_device_id' => $device->id,
                'key_id' => $keyId,
                'algorithm' => $algorithm,
                'public_key' => $encodedPublicKey,
                'public_key_fingerprint' => $fingerprint,
                'state' => 'active',
                'activated_at' => now(),
            ]);

            $retireAt = $retireExistingAfter ?: now()->addHours(24);
            DesktopDeviceTransportKey::query()
                ->where('desktop_device_id', $device->id)
                ->where('id', '!=', $key->id)
                ->where('state', 'active')
                ->whereNull('revoked_at')
                ->update([
                    'state' => 'retiring',
                    'retire_after' => $retireAt,
                    'updated_at' => now(),
                ]);

            return $key;
        });
    }

    private function assertKeyIdentifier(string $keyId): void
    {
        if (preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{7,95}$/', $keyId) !== 1) {
            throw ValidationException::withMessages([
                'transport_key_id' => ['The transport key identifier is invalid.'],
            ]);
        }
    }

    private function assertAlgorithm(string $algorithm): void
    {
        if (! hash_equals(self::X25519_XSALSA20POLY1305, $algorithm)) {
            throw ValidationException::withMessages([
                'transport_key_algorithm' => ['The transport key algorithm is not supported.'],
            ]);
        }
    }

    private function decodePublicKey(string $encodedPublicKey): string
    {
        if (preg_match('/^[A-Za-z0-9_-]{43}$/', $encodedPublicKey) !== 1) {
            throw ValidationException::withMessages([
                'transport_public_key' => ['The transport public key is not valid base64url.'],
            ]);
        }

        $decoded = base64_decode(strtr($encodedPublicKey, '-_', '+/').'=', true);
        if ($decoded === false || strlen($decoded) !== SODIUM_CRYPTO_BOX_PUBLICKEYBYTES) {
            throw ValidationException::withMessages([
                'transport_public_key' => ['The transport public key has an invalid length.'],
            ]);
        }

        return $decoded;
    }
}
