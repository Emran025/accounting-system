<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Role;
use App\Models\Session;
use App\Models\ChartOfAccount;
use App\Models\FiscalPeriod;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

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
        // Run essential seeders for RBAC and system structure
        (new \Database\Seeders\RoleSeeder())->run();
        (new \Database\Seeders\ModuleSeeder())->run();
        (new \Database\Seeders\PermissionSeeder())->run();

        // Ensure a default admin user exists for created_by FKs
        if (User::count() === 0) {
            User::factory()->create([
                'id' => 1,
                'role_id' => Role::where('role_key', 'admin')->value('id')
            ]);
        }

        $this->seedFiscalPeriod();
    }

    /**
     * Seed a valid fiscal period for tests
     */
    protected function seedFiscalPeriod(): void
    {
        FiscalPeriod::firstOrCreate(
            ['period_name' => 'FY' . Carbon::now()->year],
            [
                'start_date' => Carbon::now()->startOfYear()->format('Y-m-d'),
                'end_date' => Carbon::now()->endOfYear()->format('Y-m-d'),
                'is_closed' => false,
                'is_locked' => false,
            ]
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
        if ($response->status() !== $status) {
            $this->debugResponse($response);
            $this->fail("Expected status {$status} but got {$response->status()}.");
        }

        $response->assertJson(['success' => true]);

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
     * Highly accurate debugger for API responses.
     * Use this when a test fails unexpectedly with 4xx or 5xx status.
     * It will dump the response content, validation errors, and stack trace if requested.
     */
    protected function debugResponse($response, bool $showTrace = false)
    {
        $status = $response->status();
        $content = $response->getContent();
        $data = json_decode($content, true);

        echo "\n\n--- DEBUGGER: API RESPONSE FAILURE ---";
        echo "\nStatus: " . $status;
        
        if (isset($data['errors'])) {
            echo "\nValidation Errors: " . json_encode($data['errors'], JSON_PRETTY_PRINT);
        } elseif (isset($data['message'])) {
            echo "\nMessage: " . $data['message'];
        }

        if ($status >= 500 || $showTrace) {
            echo "\nResponse Content: " . substr($content, 0, 1000) . (strlen($content) > 1000 ? '...' : '');
            if (isset($data['exception'])) {
                echo "\nException: " . $data['exception'];
                echo "\nFile: " . $data['file'] . ":" . $data['line'];
            }
        }
        
        echo "\n---------------------------------------\n\n";
        
        return $this;
    }

    /**
     * Assert that a status is correct, and debug if it's not.
     */
    protected function assertStatusResolved($response, int $expectedStatus)
    {
        if ($response->status() !== $expectedStatus) {
            $this->debugResponse($response);
        }
        $response->assertStatus($expectedStatus);
        return $response;
    }
    /**
     * Seed Chart of Accounts with standard accounts
     */
    protected function seedChartOfAccounts(): void
    {
        // Assets
        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1110',
            'account_name' => 'Cash',
        ]);
        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1120',
            'account_name' => 'Accounts Receivable',
        ]);
        ChartOfAccount::factory()->asset()->create([
            'account_code' => '1130',
            'account_name' => 'Inventory',
        ]);

        // Liability
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2110',
            'account_name' => 'Accounts Payable',
        ]);
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2120',
            'account_name' => 'Salaries Payable',
        ]);
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2210',
            'account_name' => 'Output VAT',
        ]);
        ChartOfAccount::factory()->liability()->create([
            'account_code' => '2220',
            'account_name' => 'Input VAT',
        ]);

        // Revenue
        ChartOfAccount::factory()->revenue()->create([
            'account_code' => '4100',
            'account_name' => 'Sales Revenue',
        ]);
        ChartOfAccount::factory()->revenue()->create([
            'account_code' => '4200',
            'account_name' => 'Other Revenue',
        ]);

        // Expenses
        ChartOfAccount::factory()->expense()->create([
            'account_code' => '5100',
            'account_name' => 'Cost of Goods Sold',
        ]);
        ChartOfAccount::factory()->expense()->create([
            'account_code' => '5220',
            'account_name' => 'Salaries Expense',
        ]);
        ChartOfAccount::factory()->expense()->create([
            'account_code' => '5210',
            'account_name' => 'Operating Expenses',
        ]);
        ChartOfAccount::factory()->expense()->create([
            'account_code' => '5007',
            'account_name' => 'Sales Commission Expense',
        ]);
    }
}
