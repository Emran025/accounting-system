<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedChartOfAccounts();
    }

    public function test_unauthorized_user_cannot_access_invoices()
    {
        // Create a role with NO permissions
        $role = Role::create([
            'role_key' => 'restricted_user',
            'role_name' => 'Restricted User',
            'is_active' => true
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true
        ]);

        // Authenticate as this user
        $this->authenticateUser($user);

        // Attempt to list invoices
        $response = $this->authGet(route('api.invoices.index'));

        // improved assertion
        $response->assertStatus(403);
    }

    public function test_unauthorized_user_cannot_create_product()
    {
        // Create a role with NO permissions
        $role = Role::create([
            'role_key' => 'restricted_user',
            'role_name' => 'Restricted User',
            'is_active' => true
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true
        ]);

        $this->authenticateUser($user);

        $response = $this->authPost(route('api.products.store'), [
            'name' => 'Test',
            'sku' => 'TEST-001'
        ]);

        $response->assertStatus(403);
    }
}
