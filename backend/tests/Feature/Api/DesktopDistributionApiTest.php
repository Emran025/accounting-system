<?php

namespace Tests\Feature\Api;

use App\Domains\EnterpriseCore\DesktopDistribution\Models\DesktopDevice;
use App\Domains\EnterpriseCore\DesktopDistribution\Services\DesktopDistributionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class DesktopDistributionApiTest extends TestCase
{
    private DesktopDistributionService $desktopDistribution;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('desktop_distribution.server_id', 'server-test-001');
        config()->set('desktop_distribution.server_name', 'Accore Test Server');
        config()->set('desktop_distribution.minimum_client_version', '1.2.0');
        config()->set('desktop_distribution.certificate_fingerprint', str_repeat('b', 64));
        config()->set('desktop_distribution.enrollment_evidence_ttl_minutes', 15);

        $this->desktopDistribution = app(DesktopDistributionService::class);
    }

    public function test_bootstrap_is_narrow_and_never_exposes_erp_or_runtime_secrets(): void
    {
        $response = $this->withHeader('X-Accore-Client-Version', '1.2.0')
            ->getJson('/api/v1/desktop/bootstrap');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('desktop.server.id', 'server-test-001')
            ->assertJsonPath('desktop.api_contract', 'desktop-v1')
            ->assertJsonPath('desktop.health.status', 'healthy')
            ->assertJsonPath('desktop.enrollment.mode', 'evidence')
            ->assertJsonPath('desktop.compatibility.status', 'compatible')
            ->assertJsonMissing([
                'username' => 'admin',
                'password' => 'secret',
                'database' => 'mysql',
                'device_access_token' => 'secret',
            ]);

        $this->assertDatabaseHas('desktop_distribution_audit_events', [
            'event_type' => 'desktop.bootstrap',
            'outcome' => 'compatible',
        ]);
    }

    public function test_incompatible_client_receives_deterministic_update_required_response(): void
    {
        $bootstrap = $this->withHeader('X-Accore-Client-Version', '1.1.9')
            ->getJson('/api/v1/desktop/bootstrap');

        $bootstrap->assertOk()
            ->assertJsonPath('desktop.compatibility.status', 'update_required')
            ->assertJsonPath('desktop.compatibility.minimum_client_version', '1.2.0')
            ->assertJsonPath('desktop.compatibility.reason', 'client_version_below_minimum');

        $response = $this->postJson('/api/v1/desktop/enroll', $this->payload(
            $this->desktopDistribution->issueEnrollmentEvidence(),
            ['client_version' => '1.1.9'],
        ));

        $response->assertStatus(426)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message_key', 'desktop.error.update_required');
    }

    public function test_enrollment_is_single_use_and_persists_only_a_hash_of_the_access_token(): void
    {
        $evidence = $this->desktopDistribution->issueEnrollmentEvidence('finance-workstation');
        $payload = $this->payload($evidence);

        $response = $this->postJson('/api/v1/desktop/enroll', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('device.id', $payload['device_id'])
            ->assertJsonPath('device.status', 'active')
            ->assertJsonStructure(['device_access_token']);

        $accessToken = $response->json('device_access_token');
        $device = DesktopDevice::query()->where('device_id', $payload['device_id'])->firstOrFail();

        $this->assertNotSame($accessToken, $device->access_token_hash);
        $this->assertTrue($device->acceptsAccessToken($accessToken));
        $this->assertNotNull($device->enrolled_at);

        $replay = $this->postJson('/api/v1/desktop/enroll', $this->payload($evidence, [
            'device_id' => '22222222-2222-4222-8222-222222222222',
        ]));

        $replay->assertForbidden()
            ->assertJsonPath('message_key', 'desktop.error.enrollment_evidence_rejected');

        $this->assertDatabaseHas('desktop_enrollment_evidences', [
            'token_hash' => hash('sha256', $evidence),
        ]);
        $this->assertNotNull(
            DB::table('desktop_enrollment_evidences')->where('token_hash', hash('sha256', $evidence))->value('used_at'),
        );
    }

    public function test_enrollment_registers_a_validated_transport_public_key_without_storing_private_material(): void
    {
        $publicKey = rtrim(strtr(base64_encode(str_repeat(chr(1), SODIUM_CRYPTO_BOX_PUBLICKEYBYTES)), '+/', '-_'), '=');
        $payload = $this->payload($this->desktopDistribution->issueEnrollmentEvidence(), [
            'transport_key_id' => 'device-key-2026-08-24',
            'transport_key_algorithm' => 'x25519-xsalsa20poly1305',
            'transport_public_key' => $publicKey,
        ]);

        $response = $this->postJson('/api/v1/desktop/enroll', $payload);
        $response->assertCreated();

        $device = DesktopDevice::query()->where('device_id', $payload['device_id'])->firstOrFail();
        $this->assertDatabaseHas('desktop_device_transport_keys', [
            'desktop_device_id' => $device->id,
            'key_id' => 'device-key-2026-08-24',
            'algorithm' => 'x25519-xsalsa20poly1305',
            'public_key_fingerprint' => hash('sha256', str_repeat(chr(1), SODIUM_CRYPTO_BOX_PUBLICKEYBYTES)),
            'state' => 'active',
        ]);
        $this->assertDatabaseMissing('desktop_device_transport_keys', [
            'public_key' => 'private-key-material',
        ]);
    }

    public function test_invalid_transport_public_key_is_rejected_before_enrollment(): void
    {
        $response = $this->postJson('/api/v1/desktop/enroll', $this->payload(
            $this->desktopDistribution->issueEnrollmentEvidence(),
            [
                'transport_key_id' => 'device-key-2026-08-24',
                'transport_key_algorithm' => 'x25519-xsalsa20poly1305',
                'transport_public_key' => 'not-a-32-byte-public-key',
            ],
        ));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['transport_public_key']);
        $this->assertDatabaseCount('desktop_devices', 0);
    }

    public function test_revoked_evidence_is_rejected_without_creating_a_device(): void
    {
        $evidence = $this->desktopDistribution->issueEnrollmentEvidence();
        $this->assertTrue($this->desktopDistribution->revokeEnrollmentEvidence(
            $evidence,
            'operator-cancelled',
            'test-administrator',
        ));

        $response = $this->postJson('/api/v1/desktop/enroll', $this->payload($evidence));

        $response->assertForbidden()
            ->assertJsonPath('message_key', 'desktop.error.enrollment_evidence_rejected');

        $this->assertDatabaseCount('desktop_devices', 0);
    }

    public function test_certificate_mismatch_is_rejected_before_enrollment(): void
    {
        $response = $this->postJson('/api/v1/desktop/enroll', $this->payload(
            $this->desktopDistribution->issueEnrollmentEvidence(),
            ['certificate_fingerprint' => str_repeat('c', 64)],
        ));

        $response->assertConflict()
            ->assertJsonPath('message_key', 'desktop.error.certificate_mismatch');

        $this->assertDatabaseCount('desktop_devices', 0);
    }

    public function test_expired_evidence_is_rejected_without_creating_a_device(): void
    {
        $evidence = $this->desktopDistribution->issueEnrollmentEvidence(
            expiresAt: now()->subMinute(),
        );

        $response = $this->postJson('/api/v1/desktop/enroll', $this->payload($evidence));

        $response->assertForbidden()
            ->assertJsonPath('message_key', 'desktop.error.enrollment_evidence_rejected');

        $this->assertDatabaseCount('desktop_devices', 0);
    }

    public function test_revoked_device_cannot_obtain_policy(): void
    {
        [$payload, $accessToken] = $this->enrollDevice('33333333-3333-4333-8333-333333333333');

        $this->assertTrue($this->desktopDistribution->revokeDevice(
            $payload['device_id'],
            'lost-device',
            'test-administrator',
        ));

        $response = $this->withHeaders([
            'X-Accore-Device-Id' => $payload['device_id'],
            'X-Accore-Device-Token' => $accessToken,
            'X-Accore-Client-Version' => '1.2.0',
        ])->getJson('/api/v1/desktop/policy');

        $response->assertForbidden()
            ->assertJsonPath('message_key', 'desktop.error.device_revoked');

        $this->assertDatabaseHas('desktop_distribution_audit_events', [
            'event_type' => 'desktop.policy',
            'outcome' => 'device_revoked',
        ]);
    }

    public function test_authorized_device_receives_policy_but_never_a_replacement_access_token(): void
    {
        [$payload, $accessToken] = $this->enrollDevice('44444444-4444-4444-8444-444444444444');

        $response = $this->withHeaders([
            'X-Accore-Device-Id' => $payload['device_id'],
            'X-Accore-Device-Token' => $accessToken,
            'X-Accore-Client-Version' => '1.2.0',
        ])->getJson('/api/v1/desktop/policy');

        $response->assertOk()
            ->assertJsonPath('desktop.device.id', $payload['device_id'])
            ->assertJsonPath('desktop.compatibility.status', 'compatible')
            ->assertJsonPath('desktop.policy.credential_refresh', 'not_available')
            ->assertJsonMissing(['device_access_token' => $accessToken]);
    }

    public function test_incompatible_enrolled_device_receives_update_required_policy_response(): void
    {
        [$payload, $accessToken] = $this->enrollDevice('55555555-5555-4555-8555-555555555555');

        $response = $this->withHeaders([
            'X-Accore-Device-Id' => $payload['device_id'],
            'X-Accore-Device-Token' => $accessToken,
            'X-Accore-Client-Version' => '1.1.9',
        ])->getJson('/api/v1/desktop/policy');

        $response->assertStatus(426)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message_key', 'desktop.error.update_required')
            ->assertJsonPath('desktop.compatibility.status', 'update_required')
            ->assertJsonPath('desktop.compatibility.minimum_client_version', '1.2.0');
    }

    public function test_desktop_bootstrap_is_rate_limited(): void
    {
        $ipAddress = '203.0.113.48';
        RateLimiter::clear('desktop-bootstrap:'.$ipAddress);

        for ($attempt = 0; $attempt < 30; $attempt++) {
            $response = $this->withServerVariables(['REMOTE_ADDR' => $ipAddress])
                ->withHeader('X-Accore-Client-Version', '1.2.0')
                ->getJson('/api/v1/desktop/bootstrap');

            $response->assertOk();
        }

        $limited = $this->withServerVariables(['REMOTE_ADDR' => $ipAddress])
            ->withHeader('X-Accore-Client-Version', '1.2.0')
            ->getJson('/api/v1/desktop/bootstrap');

        $limited->assertStatus(429)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('desktop_distribution_audit_events', [
            'event_type' => 'desktop.bootstrap',
            'outcome' => 'rate_limited',
        ]);
    }

    /**
     * @return array{0: array<string, string>, 1: string}
     */
    private function enrollDevice(string $deviceId): array
    {
        $payload = $this->payload(
            $this->desktopDistribution->issueEnrollmentEvidence(),
            ['device_id' => $deviceId],
        );

        $response = $this->postJson('/api/v1/desktop/enroll', $payload);
        $response->assertCreated();

        return [$payload, $response->json('device_access_token')];
    }

    /**
     * @param  array<string, string>  $overrides
     * @return array<string, string>
     */
    private function payload(string $evidence, array $overrides = []): array
    {
        return array_merge([
            'server_id' => 'server-test-001',
            'device_id' => '11111111-1111-4111-8111-111111111111',
            'display_name' => 'Finance workstation',
            'platform' => 'linux',
            'client_version' => '1.2.0',
            'public_key_fingerprint' => str_repeat('a', 64),
            'certificate_fingerprint' => str_repeat('b', 64),
            'enrollment_evidence' => $evidence,
        ], $overrides);
    }
}
