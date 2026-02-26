<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Session;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_session_token()
    {
        $password = 'password123';
        User::factory()->create([
            'username' => 'apiuser',
            'password' => Hash::make($password),
            'is_active' => true,
        ]);

        $response = $this->postJson(route('api.login'), [
            'username' => 'apiuser',
            'password' => $password,
        ]);

        $this->assertSuccessResponse($response, 200);
        $response->assertJsonStructure([
            'success',
            'user',
            'token',
            'permissions'
        ]);

        $token = $response->json('token');
        $this->assertDatabaseHas('sessions', ['session_token' => $token]);
    }

    public function test_login_fails_with_invalid_credentials()
    {
        User::factory()->create([
            'username' => 'apiuser',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson(route('api.login'), [
            'username' => 'apiuser',
            'password' => 'wrong',
        ]);

        $this->assertErrorResponse($response, 401);
        // Wait, AuthService returns array, Controller probably returns JSON.
        // Let's check AuthController to be sure about status code.
    }

    public function test_logout_invalidates_session()
    {
        $user = User::factory()->create();
        $this->authenticateUser($user);
        $token = $this->sessionToken;

        $response = $this->postJson(route('api.logout'), [], [
            'X-Session-Token' => $token
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('sessions', ['session_token' => $token]);
    }

    public function test_check_returns_user_info_when_authenticated()
    {
        $user = User::factory()->create();
        $this->authenticateUser($user);

        $response = $this->getJson(route('api.check'), [
            'X-Session-Token' => $this->sessionToken
        ]);

        $this->assertSuccessResponse($response);
        $response->assertJson([
            'user' => [
                'id' => $user->id,
                'username' => $user->username
            ]
        ]);
    }

    public function test_check_returns_unauthorized_when_not_logged_in()
    {
        $response = $this->getJson(route('api.check'));

        // Middleware might return 401 or Controller might return false.
        // Based on ApiAuth middleware I read:
        // returns response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        
        $this->assertErrorResponse($response, 401);
    }
}
