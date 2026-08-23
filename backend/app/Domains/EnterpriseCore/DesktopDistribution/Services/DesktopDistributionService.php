<?php

namespace App\Domains\EnterpriseCore\DesktopDistribution\Services;

use App\Domains\EnterpriseCore\DesktopDistribution\Models\DesktopDevice;
use App\Domains\EnterpriseCore\DesktopDistribution\Models\DesktopDistributionAuditEvent;
use App\Domains\EnterpriseCore\DesktopDistribution\Models\DesktopEnrollmentEvidence;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DesktopDistributionService
{
    public function __construct(private readonly TransportKeyLifecycleService $transportKeys) {}

    public function bootstrap(string $clientVersion, ?string $ipAddress): array
    {
        $compatibility = $this->compatibilityFor($clientVersion);

        $this->audit('desktop.bootstrap', $compatibility['status'], $ipAddress, null, [
            'client_version' => $clientVersion,
            'compatibility' => $compatibility['status'],
        ]);

        return [
            'server' => [
                'id' => (string) config('desktop_distribution.server_id'),
                'name' => (string) config('desktop_distribution.server_name'),
            ],
            'api_contract' => (string) config('desktop_distribution.api_contract'),
            'health' => [
                'status' => 'healthy',
            ],
            'enrollment' => [
                'mode' => (string) config('desktop_distribution.enrollment_mode'),
            ],
            'certificate_binding' => [
                'algorithm' => 'sha256',
                'server_certificate_fingerprint' => config('desktop_distribution.certificate_fingerprint'),
            ],
            'compatibility' => $compatibility,
            'transport_security' => [
                'protocol' => (string) config('transport_security.protocol'),
                'mode' => (string) config('transport_security.mode'),
                'key_algorithm' => (string) config('transport_security.key_algorithm'),
            ],
        ];
    }

    public function compatibilityFor(string $clientVersion): array
    {
        $minimumClientVersion = (string) config('desktop_distribution.minimum_client_version');
        $isCompatible = version_compare($clientVersion, $minimumClientVersion, '>=');

        return [
            'status' => $isCompatible ? 'compatible' : 'update_required',
            'minimum_client_version' => $minimumClientVersion,
            'client_version' => $clientVersion,
            'reason' => $isCompatible ? null : 'client_version_below_minimum',
        ];
    }

    public function issueEnrollmentEvidence(
        ?string $label = null,
        ?string $issuedBy = null,
        ?CarbonInterface $expiresAt = null,
    ): string {
        $evidence = Str::random(72);

        DesktopEnrollmentEvidence::query()->create([
            'token_hash' => hash('sha256', $evidence),
            'label' => $label,
            'issued_by' => $issuedBy ?: 'local-administrator',
            'expires_at' => $expiresAt ?: now()->addMinutes((int) config('desktop_distribution.enrollment_evidence_ttl_minutes')),
        ]);

        $this->audit('desktop.enrollment_evidence.issued', 'success', null, null, [
            'label' => $label,
        ]);

        return $evidence;
    }

    /**
     * @return array{status: string, device?: DesktopDevice, access_token?: string}
     */
    public function enroll(array $payload, ?string $ipAddress): array
    {
        $compatibility = $this->compatibilityFor($payload['client_version']);

        if ((string) $payload['server_id'] !== (string) config('desktop_distribution.server_id')) {
            $this->audit('desktop.enrollment', 'server_mismatch', $ipAddress, null, [
                'device_id' => $payload['device_id'],
            ]);

            return ['status' => 'server_mismatch'];
        }

        if ($compatibility['status'] !== 'compatible') {
            $this->audit('desktop.enrollment', 'update_required', $ipAddress, null, [
                'device_id' => $payload['device_id'],
                'client_version' => $payload['client_version'],
            ]);

            return ['status' => 'update_required'];
        }

        $serverCertificateFingerprint = config('desktop_distribution.certificate_fingerprint');
        if ($serverCertificateFingerprint !== null && (! isset($payload['certificate_fingerprint'])
            || ! hash_equals(strtolower((string) $serverCertificateFingerprint), strtolower($payload['certificate_fingerprint'])))) {
            $this->audit('desktop.enrollment', 'certificate_mismatch', $ipAddress, null, [
                'device_id' => $payload['device_id'],
            ]);

            return ['status' => 'certificate_mismatch'];
        }

        return DB::transaction(function () use ($payload, $ipAddress): array {
            $evidence = DesktopEnrollmentEvidence::query()
                ->where('token_hash', hash('sha256', $payload['enrollment_evidence']))
                ->lockForUpdate()
                ->first();

            if ($evidence === null || ! $evidence->isUsableAt(now())) {
                $this->audit('desktop.enrollment', 'evidence_rejected', $ipAddress, null, [
                    'device_id' => $payload['device_id'],
                ]);

                return ['status' => 'evidence_rejected'];
            }

            $existingDevice = DesktopDevice::query()
                ->where('device_id', $payload['device_id'])
                ->lockForUpdate()
                ->first();

            if ($existingDevice !== null) {
                $this->audit('desktop.enrollment', 'device_already_enrolled', $ipAddress, $existingDevice, [
                    'device_id' => $payload['device_id'],
                ]);

                return ['status' => $existingDevice->isRevoked() ? 'device_revoked' : 'device_already_enrolled'];
            }

            // Claim the evidence under the same database lock that creates the device,
            // preventing concurrent replay from consuming it more than once.
            $evidence->forceFill(['used_at' => now()])->save();

            $accessToken = Str::random(96);
            $device = DesktopDevice::query()->create([
                'device_id' => $payload['device_id'],
                'display_name' => $payload['display_name'],
                'platform' => $payload['platform'],
                'client_version' => $payload['client_version'],
                'public_key_fingerprint' => strtolower($payload['public_key_fingerprint']),
                'certificate_fingerprint' => isset($payload['certificate_fingerprint'])
                    ? strtolower($payload['certificate_fingerprint'])
                    : null,
                'access_token_hash' => Hash::make($accessToken),
                'enrolled_at' => now(),
                'last_seen_at' => now(),
            ]);

            if (isset($payload['transport_key_id'], $payload['transport_key_algorithm'], $payload['transport_public_key'])) {
                $this->transportKeys->registerDeviceKey(
                    $device,
                    $payload['transport_key_id'],
                    $payload['transport_key_algorithm'],
                    $payload['transport_public_key'],
                );
            }

            $this->audit('desktop.enrollment', 'success', $ipAddress, $device, [
                'device_id' => $device->device_id,
                'platform' => $device->platform,
                'client_version' => $device->client_version,
            ]);

            return [
                'status' => 'enrolled',
                'device' => $device,
                'access_token' => $accessToken,
            ];
        });
    }

    /**
     * @return array{status: string, device?: DesktopDevice}
     */
    public function authenticateDevice(string $deviceId, string $accessToken, ?string $ipAddress): array
    {
        $device = DesktopDevice::query()->where('device_id', $deviceId)->first();

        if ($device === null || ! $device->acceptsAccessToken($accessToken)) {
            $this->audit('desktop.policy', 'device_not_authorized', $ipAddress, $device, [
                'device_id' => $deviceId,
            ]);

            return ['status' => 'device_not_authorized'];
        }

        if ($device->isRevoked()) {
            $this->audit('desktop.policy', 'device_revoked', $ipAddress, $device, [
                'device_id' => $deviceId,
            ]);

            return ['status' => 'device_revoked'];
        }

        $device->forceFill(['last_seen_at' => now()])->save();

        return ['status' => 'authorized', 'device' => $device];
    }

    public function policyFor(DesktopDevice $device, string $clientVersion, ?string $ipAddress): array
    {
        $compatibility = $this->compatibilityFor($clientVersion);

        $this->audit('desktop.policy', $compatibility['status'], $ipAddress, $device, [
            'device_id' => $device->device_id,
            'client_version' => $clientVersion,
        ]);

        return [
            'device' => [
                'id' => $device->device_id,
                'status' => 'active',
            ],
            'api_contract' => (string) config('desktop_distribution.api_contract'),
            'compatibility' => $compatibility,
            'policy' => [
                'credential_refresh' => 'not_available',
                're_enrollment_required' => false,
            ],
        ];
    }

    public function revokeEnrollmentEvidence(string $evidence, string $reason, ?string $actor = null): bool
    {
        $enrollmentEvidence = DesktopEnrollmentEvidence::query()
            ->where('token_hash', hash('sha256', $evidence))
            ->first();

        if ($enrollmentEvidence === null || $enrollmentEvidence->used_at !== null || $enrollmentEvidence->revoked_at !== null) {
            return false;
        }

        $enrollmentEvidence->forceFill(['revoked_at' => now()])->save();

        $this->audit('desktop.enrollment_evidence.revoked', 'success', null, null, [
            'actor' => $actor ?: 'local-administrator',
            'reason' => $reason,
            'label' => $enrollmentEvidence->label,
        ]);

        return true;
    }

    public function revokeDevice(string $deviceId, string $reason, ?string $actor = null): bool
    {
        $device = DesktopDevice::query()->where('device_id', $deviceId)->first();

        if ($device === null || $device->isRevoked()) {
            return false;
        }

        $device->forceFill([
            'revoked_at' => now(),
            'revoked_reason' => $reason,
        ])->save();

        $this->audit('desktop.device.revoked', 'success', null, $device, [
            'device_id' => $device->device_id,
            'actor' => $actor ?: 'local-administrator',
            'reason' => $reason,
        ]);

        return true;
    }

    private function audit(
        string $eventType,
        string $outcome,
        ?string $ipAddress,
        ?DesktopDevice $device,
        array $context = [],
    ): void {
        DesktopDistributionAuditEvent::query()->create([
            'desktop_device_id' => $device?->id,
            'event_type' => $eventType,
            'outcome' => $outcome,
            'ip_address' => $ipAddress,
            'context' => $context,
        ]);
    }
}
