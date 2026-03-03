<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class UsersApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_users()
    {
        $response = $this->authGet(route('api.users.index'));

        $this->assertSuccessResponse($response);
    }

    public function test_can_create_user()
    {
        $role = Role::where('role_key', 'admin')->first();

        $data = [
            'username' => 'newuser',
            'password' => 'password123',
            'full_name' => 'New User',
            'role_id' => $role->id,
        ];

        $response = $this->authPost(route('api.users.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('users', ['username' => 'newuser']);
    }

    public function test_create_user_rejects_duplicate_username()
    {
        User::factory()->create(['username' => 'existing']);

        $data = [
            'username' => 'existing',
            'password' => 'password123',
        ];

        $response = $this->authPost(route('api.users.store'), $data);

        $response->assertStatus(422);
    }

    public function test_can_update_user()
    {
        $user = User::factory()->create(['username' => 'oldname']);

        $data = [
            'id' => $user->id,
            'username' => 'newname',
            'full_name' => 'Updated Name',
        ];

        $response = $this->authPut(route('api.users.update'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'newname',
        ]);
    }

    public function test_can_delete_user()
    {
        $user = User::factory()->create();

        $response = $this->authDelete(route('api.users.destroy'), ['id' => $user->id]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_can_change_password()
    {
        $password = 'oldpassword';
        $user = User::factory()->create([
            'password' => Hash::make($password),
        ]);

        $this->authenticateUser($user);

        $data = [
            'current_password' => $password,
            'new_password' => 'newpassword123',
        ];

        $response = $this->authPost(route('api.change_password'), $data);

        $this->assertSuccessResponse($response);
        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
    }

    public function test_change_password_fails_with_wrong_current()
    {
        $user = User::factory()->create([
            'password' => Hash::make('correctpassword'),
        ]);

        $this->authenticateUser($user);

        $data = [
            'current_password' => 'wrongpassword',
            'new_password' => 'newpassword123',
        ];

        $response = $this->authPost(route('api.change_password'), $data);

        $this->assertErrorResponse($response, 400);
    }

    public function test_can_list_managers()
    {
        User::factory()->create(['role' => 'manager']);

        $response = $this->authGet(route('api.manager_list'));

        $this->assertSuccessResponse($response);
    }

    public function test_can_list_my_sessions()
    {
        $response = $this->authGet(route('api.my_sessions'));

        $this->assertSuccessResponse($response);
    }
}
