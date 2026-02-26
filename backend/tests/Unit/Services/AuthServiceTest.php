<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\User;
use App\Models\Session;
use App\Models\LoginAttempt;
use App\Services\AuthService;
use App\Services\PermissionService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthServiceTest extends TestCase
{
    use RefreshDatabase;

    private AuthService $authService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authService = new AuthService();
    }

    public function test_login_success_with_valid_credentials()
    {
        $password = 'password123';
        $user = User::factory()->create([
            'username' => 'testuser',
            'password' => Hash::make($password),
            'is_active' => true,
        ]);

        $result = $this->authService->login('testuser', $password);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('session_token', $result);
        $this->assertEquals($user->id, $result['user_id']);
        
        $this->assertDatabaseHas('sessions', [
            'user_id' => $user->id,
            'session_token' => $result['session_token']
        ]);
    }

    public function test_login_fails_with_invalid_password()
    {
        User::factory()->create([
            'username' => 'testuser',
            'password' => Hash::make('password123'),
        ]);

        $result = $this->authService->login('testuser', 'wrong_password');

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid username or password', $result['message']);
        
        $this->assertDatabaseHas('login_attempts', [
            'username' => 'testuser',
            'attempts' => 1
        ]);
    }

    public function test_login_fails_with_nonexistent_user()
    {
        $result = $this->authService->login('nonexistent', 'password');

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid username or password', $result['message']);
    }

    public function test_login_fails_for_inactive_user()
    {
        User::factory()->inactive()->create([
            'username' => 'inactive',
            'password' => Hash::make('password123'),
        ]);

        $result = $this->authService->login('inactive', 'password123');

        $this->assertFalse($result['success']);
        $this->assertEquals('Account is inactive', $result['message']);
    }

    public function test_account_locks_after_max_failed_attempts()
    {
        // Simulate 2 failed attempts
        LoginAttempt::factory()->create([
            'username' => 'testuser',
            'attempts' => 2,
            'last_attempt' => now()
        ]);

        // Attempt 3 (should fail and lock)
        $result = $this->authService->login('testuser', 'wrong');
        
        $this->assertFalse($result['success']);
        
        $attempt = LoginAttempt::where('username', 'testuser')->first();
        $this->assertEquals(3, $attempt->attempts);
        $this->assertNotNull($attempt->locked_until);
        
        // Attempt 4 (should be locked)
        $result = $this->authService->login('testuser', 'wrong');
        
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Account locked', $result['message']);
    }

    public function test_logout_destroys_session()
    {
        $user = User::factory()->create();
        $token = 'test-token-123';
        
        Session::create([
            'user_id' => $user->id,
            'session_token' => $token,
            'expires_at' => now()->addHour(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test'
        ]);

        $this->authService->logout($token);

        $this->assertDatabaseMissing('sessions', [
            'session_token' => $token
        ]);
    }

    public function test_check_session_returns_user_for_valid_token()
    {
        $user = User::factory()->create();
        $token = 'valid-token';
        
        Session::create([
            'user_id' => $user->id,
            'session_token' => $token,
            'expires_at' => now()->addHour(),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test'
        ]);

        $resultUser = $this->authService->checkSession($token);

        $this->assertNotNull($resultUser);
        $this->assertEquals($user->id, $resultUser->id);
    }

    public function test_check_session_returns_null_for_expired_token()
    {
        $user = User::factory()->create();
        $token = 'expired-token';
        
        Session::create([
            'user_id' => $user->id,
            'session_token' => $token,
            'expires_at' => now()->subHour(), // Expired
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Test'
        ]);

        $resultUser = $this->authService->checkSession($token);

        $this->assertNull($resultUser);
    }
}
