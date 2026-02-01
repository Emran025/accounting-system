<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Test API rate limiting
 */
class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /**
     * Test that login endpoint has stricter rate limiting
     */
    public function test_login_endpoint_rate_limiting(): void
    {
        // Make 5 requests (should succeed)
        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/login', [
                'username' => 'test',
                'password' => 'wrong',
            ]);
            
            // Should not be rate limited yet
            $this->assertNotEquals(429, $response->status());
        }

        // 6th request should be rate limited
        $response = $this->postJson('/api/login', [
            'username' => 'test',
            'password' => 'wrong',
        ]);

        $this->assertEquals(429, $response->status());
    }

    /**
     * Test that protected endpoints have rate limiting
     */
    public function test_protected_endpoints_rate_limiting(): void
    {
        // Authenticate user
        $token = $this->user->createToken('test')->plainTextToken;

        // Make 60 requests (should succeed)
        for ($i = 0; $i < 60; $i++) {
            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->getJson('/api/invoices');
            
            // Should not be rate limited yet
            if ($i < 60) {
                $this->assertNotEquals(429, $response->status());
            }
        }

        // 61st request should be rate limited
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/invoices');

        $this->assertEquals(429, $response->status());
    }

    /**
     * Test that ZATCA endpoint has stricter rate limiting
     */
    public function test_zatca_endpoint_rate_limiting(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;
        $invoice = \App\Models\Invoice::factory()->create();

        // Make 10 requests (should succeed)
        for ($i = 0; $i < 10; $i++) {
            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->postJson("/api/invoices/{$invoice->id}/zatca/submit");
            
            // Should not be rate limited yet
            if ($i < 10) {
                $this->assertNotEquals(429, $response->status());
            }
        }

        // 11th request should be rate limited
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/invoices/{$invoice->id}/zatca/submit");

        $this->assertEquals(429, $response->status());
    }
}

