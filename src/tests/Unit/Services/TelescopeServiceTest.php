<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\TelescopeService;
use App\Models\Telescope;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TelescopeServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_log_operation_creates_telescope_entry()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        TelescopeService::logOperation(
            'UPDATE',
            'invoices',
            100,
            ['status' => 'draft'],
            ['status' => 'paid']
        );

        $this->assertDatabaseHas('telescope_entries', [
            'user_id' => $user->id,
            'operation' => 'UPDATE',
            'table_name' => 'invoices',
            'record_id' => 100,
        ]);
        
        $entry = Telescope::where('record_id', 100)->first();
        $this->assertEquals(['status' => 'draft'], $entry->old_values);
        $this->assertEquals(['status' => 'paid'], $entry->new_values);
    }

    public function test_log_operation_handles_guest_user()
    {
        TelescopeService::logOperation('CREATE', 'logs');

        $this->assertDatabaseHas('telescope_entries', [
            'operation' => 'CREATE',
            'user_id' => null
        ]);
    }
}
