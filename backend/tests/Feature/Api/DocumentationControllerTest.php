<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\V2\Platform\Documentation\DocumentationController;
use Tests\TestCase;

class DocumentationControllerTest extends TestCase
{
    public function test_it_returns_the_documentation_home_with_sidebar_and_navigation(): void
    {
        $response = app(DocumentationController::class)->show();
        $payload = $response->getData(true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($payload['success']);
        $this->assertSame('DOCUMENTATION_INDEX', $payload['current_path']);
        $this->assertNotEmpty($payload['content']);
        $this->assertNotEmpty($payload['sidebar']);
        $this->assertArrayHasKey('prev', $payload['navigation']);
        $this->assertArrayHasKey('next', $payload['navigation']);
    }

    public function test_it_resolves_markdown_extensions_and_rejects_private_documentation_segments(): void
    {
        $documentResponse = app(DocumentationController::class)->show('USER_GUIDE.md');
        $privateResponse = app(DocumentationController::class)->show('Plans/quality-remediation-notes-ar');

        $this->assertSame(200, $documentResponse->getStatusCode());
        $this->assertSame('USER_GUIDE', $documentResponse->getData(true)['current_path']);
        $this->assertSame(404, $privateResponse->getStatusCode());
    }
}
