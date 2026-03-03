<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Batch;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BatchApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->authenticateUser();
    }

    public function test_can_list_batches()
    {
        Batch::create([
            'batch_name' => 'Test Batch',
            'batch_type' => 'invoices',
            'status' => 'pending',
            'total_items' => 0,
            'created_by' => $this->authenticatedUser->id,
        ]);

        $response = $this->authGet(route('api.batch.index'));

        $this->assertSuccessResponse($response);
        $response->assertJsonStructure(['success', 'data', 'pagination']);
    }

    public function test_can_create_batch()
    {
        $data = [
            'batch_name' => 'Invoice Batch',
            'batch_type' => 'invoices',
            'description' => 'Batch of invoices for processing',
        ];

        $response = $this->authPost(route('api.batch.store'), $data);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseHas('batch_processing', [
            'batch_name' => 'Invoice Batch',
            'status' => 'pending',
        ]);
    }

    public function test_can_delete_pending_batch()
    {
        $batch = Batch::create([
            'batch_name' => 'Deletable',
            'batch_type' => 'invoices',
            'status' => 'pending',
            'total_items' => 0,
            'created_by' => $this->authenticatedUser->id,
        ]);

        $response = $this->authDelete(route('api.batch.destroy'), ['id' => $batch->id]);

        $this->assertSuccessResponse($response);
        $this->assertDatabaseMissing('batch_processing', ['id' => $batch->id]);
    }

    public function test_cannot_delete_processing_batch()
    {
        $batch = Batch::create([
            'batch_name' => 'In Progress',
            'batch_type' => 'invoices',
            'status' => 'processing',
            'total_items' => 5,
            'created_by' => $this->authenticatedUser->id,
        ]);

        $response = $this->authDelete(route('api.batch.destroy'), ['id' => $batch->id]);

        $this->assertErrorResponse($response, 400);
        $this->assertDatabaseHas('batch_processing', ['id' => $batch->id]);
    }

    public function test_can_execute_batch()
    {
        $batch = Batch::create([
            'batch_name' => 'Execute Me',
            'batch_type' => 'invoices',
            'status' => 'pending',
            'total_items' => 3,
            'created_by' => $this->authenticatedUser->id,
        ]);

        $response = $this->authPost(route('api.batch.store') . '?action=execute', [
            'batch_id' => $batch->id,
        ]);

        $this->assertSuccessResponse($response);
        $this->assertEquals('completed', $batch->fresh()->status);
    }

    public function test_create_batch_validates_required_fields()
    {
        $response = $this->authPost(route('api.batch.store'), []);

        $response->assertStatus(422);
    }
}
