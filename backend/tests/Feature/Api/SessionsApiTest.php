<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Session;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SessionsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_sessions()
    {
        $response = $this->authGet(route('api.sessions.index'));

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['success', 'sessions', 'total']);
    }

    public function test_can_destroy_other_session()
    {
        // Create a second session for the same user
        $otherSession = Session::create([
            'user_id' => $this->authenticatedUser->id,
            'session_token' => bin2hex(random_bytes(32)),
            'expires_at' => now()->addHour(),
            'ip_address' => '192.168.1.1',
            'user_agent' => 'Another Device',
        ]);

        $response = $this->authDelete(route('api.sessions.destroy', ['id' => $otherSession->id]));

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('sessions', ['id' => $otherSession->id]);
    }

    public function test_cannot_destroy_current_session()
    {
        // The current session is the one created by authenticateUser()
        $currentSession = Session::where('session_token', $this->sessionToken)->first();

        $response = $this->authDelete(route('api.sessions.destroy', ['id' => $currentSession->id]));

        $this->assertErrorResponse($response, 400);
        $this->assertDatabaseHas('sessions', ['id' => $currentSession->id]);
    }

    public function test_cannot_destroy_other_users_session()
    {
        $otherUser = User::factory()->create();
        $otherSession = Session::create([
            'user_id' => $otherUser->id,
            'session_token' => bin2hex(random_bytes(32)),
            'expires_at' => now()->addHour(),
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Other User Device',
        ]);

        // Should fail because the session doesn't belong to the authenticated user
        $response = $this->authDelete(route('api.sessions.destroy', ['id' => $otherSession->id]));

        $response->assertStatus(404);
    }
}
