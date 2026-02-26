<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SettingsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    // Role Tests
    // Role Tests
    public function test_can_list_roles()
    {
        Role::factory()->count(2)->create();

        $response = $this->authGet(route('api.roles.index'));

        $this->assertSuccessResponse($response);
        // Admin role + 2 created = 3 at least
        $this->assertGreaterThanOrEqual(3, count($response->json('roles')));
    }

    public function test_can_create_role()
    {
        $response = $this->authPost(route('api.roles.store'), [
            'name' => 'Manager', // Changed from role_name
            'description' => 'Store Manager' // role_key is generated
        ]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('roles', ['role_key' => 'manager']);
    }

    // Users Tests
    public function test_can_list_users()
    {
        User::factory()->count(2)->create();

        $response = $this->authGet(route('api.users.index'));

        $this->assertSuccessResponse($response);
        // Auth user + 2 created = 3
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }

    public function test_can_create_user()
    {
        $role = Role::first();

        $data = [
            'username' => 'newuser',
            // 'email' => 'newuser@example.com', // Removed as email column does not exist
            'password' => 'password123',
            'role_id' => $role->id,
            'is_active' => true
        ];

        $response = $this->authPost(route('api.users.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('users', ['username' => 'newuser']);
    }

    // Session/Auth Tests covered partly in AuthApiTest, but let's test listing active sessions if endpoint exists
    public function test_can_list_active_sessions()
    {
        // Route assumed: api.sessions.index
        $response = $this->authGet(route('api.sessions.index'));
        
        // This might fail if route doesn't exist, but we saw SessionsController.
        $this->assertSuccessResponse($response);
    }
}
