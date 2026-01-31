<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Role;
use App\Models\Session;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected ?User $authenticatedUser = null;
    protected ?string $sessionToken = null;

    /**
     * Set up common test fixtures
     */
    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed essential data for tests
        $this->seedEssentialData();
    }

    /**
     * Seed essential data required for most tests
     */
    protected function seedEssentialData(): void
    {
        // Create default admin role if not exists
        Role::firstOrCreate(
            ['role_key' => 'admin'],
            ['role_name' => 'Administrator', 'is_active' => true]
        );
    }

    /**
     * Create and authenticate a user for API testing
     */
    protected function authenticateUser(?User $user = null): static
    {
        if (!$user) {
            $role = Role::where('role_key', 'admin')->first();
            $user = User::factory()->create([
                'role_id' => $role?->id,
                'is_active' => true,
            ]);
        }

        $this->authenticatedUser = $user;
        $this->sessionToken = $this->createSessionToken($user);

        return $this;
    }

    /**
     * Create a session token for the user
     */
    protected function createSessionToken(User $user): string
    {
        $token = bin2hex(random_bytes(32));
        
        Session::create([
            'user_id' => $user->id,
            'session_token' => $token,
            'expires_at' => now()->addHour(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit Test',
        ]);

        return $token;
    }

    /**
     * Get headers for authenticated API requests
     */
    protected function authHeaders(): array
    {
        return [
            'X-Session-Token' => $this->sessionToken,
            'Accept' => 'application/json',
        ];
    }

    /**
     * Make an authenticated GET request
     */
    protected function authGet(string $uri, array $headers = [])
    {
        return $this->withHeaders(array_merge($this->authHeaders(), $headers))
            ->get($uri);
    }

    /**
     * Make an authenticated POST request
     */
    protected function authPost(string $uri, array $data = [], array $headers = [])
    {
        return $this->withHeaders(array_merge($this->authHeaders(), $headers))
            ->postJson($uri, $data);
    }

    /**
     * Make an authenticated PUT request
     */
    protected function authPut(string $uri, array $data = [], array $headers = [])
    {
        return $this->withHeaders(array_merge($this->authHeaders(), $headers))
            ->putJson($uri, $data);
    }

    /**
     * Make an authenticated DELETE request
     */
    protected function authDelete(string $uri, array $data = [], array $headers = [])
    {
        return $this->withHeaders(array_merge($this->authHeaders(), $headers))
            ->deleteJson($uri, $data);
    }

    /**
     * Assert that a response is successful JSON
     */
    protected function assertSuccessResponse($response, int $status = 200)
    {
        $response->assertStatus($status)
            ->assertJson(['success' => true]);
        
        return $response;
    }

    /**
     * Assert that a response is an error JSON
     */
    protected function assertErrorResponse($response, int $status = 400)
    {
        $response->assertStatus($status)
            ->assertJson(['success' => false]);
        
        return $response;
    }
    /**
     * Seed Chart of Accounts with standard accounts
     */
    protected function seedChartOfAccounts(): void
    {
        // Assets
        \App\Models\ChartOfAccount::factory()->asset()->create([
            'account_code' => '1110',
            'account_name' => 'Cash',
        ]);
        \App\Models\ChartOfAccount::factory()->asset()->create([
            'account_code' => '1120',
            'account_name' => 'Accounts Receivable',
        ]);
        \App\Models\ChartOfAccount::factory()->asset()->create([
            'account_code' => '1130',
            'account_name' => 'Inventory',
        ]);
        
        // Liability
        \App\Models\ChartOfAccount::factory()->liability()->create([
            'account_code' => '2210',
            'account_name' => 'Output VAT',
        ]);
        \App\Models\ChartOfAccount::factory()->liability()->create([
            'account_code' => '2220',
            'account_name' => 'Input VAT',
        ]);

        // Revenue
        \App\Models\ChartOfAccount::factory()->revenue()->create([
            'account_code' => '4100',
            'account_name' => 'Sales Revenue',
        ]);

        // Expenses
        \App\Models\ChartOfAccount::factory()->expense()->create([
            'account_code' => '5100',
            'account_name' => 'Cost of Goods Sold',
        ]);
    }
}
