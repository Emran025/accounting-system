<?php

use App\Http\Controllers\Api\V1\Desktop\DesktopDistributionController;
use App\Http\Controllers\Api\V2\Platform\Documentation\DocumentationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Desktop distribution API v1
|--------------------------------------------------------------------------
|
| This contract is intentionally separate from ERP v2 routes. It exposes only
| bootstrap, enrollment, and device-policy data required by Accore Client.
|
*/
Route::prefix('v1/desktop')->group(function (): void {
    Route::get('/bootstrap', [DesktopDistributionController::class, 'bootstrap'])
        ->middleware('throttle:desktop-bootstrap')
        ->name('v1.desktop.bootstrap');

    Route::post('/enroll', [DesktopDistributionController::class, 'enroll'])
        ->middleware('throttle:desktop-enroll')
        ->name('v1.desktop.enroll');

    Route::get('/policy', [DesktopDistributionController::class, 'policy'])
        ->middleware('throttle:desktop-policy')
        ->name('v1.desktop.policy');
});

/*
|--------------------------------------------------------------------------
| API Routes v2
|--------------------------------------------------------------------------
*/

Route::group(['prefix' => 'v2'], function () {
    require __DIR__.'/domains/00-auth.php';
    require __DIR__.'/domains/10-platform.php';

    // Public, read-only documentation. The controller excludes internal trees.
    Route::get('/documentation/{path?}', [DocumentationController::class, 'show'])
        ->where('path', '.*')
        ->middleware('throttle:api')
        ->name('v2.documentation.show');

    Route::group(['middleware' => ['api.auth', 'throttle:api']], function () {
        /*
        |--------------------------------------------------------------------------
        | Domain Routes (Strangler Fig – v2)
        |--------------------------------------------------------------------------
        | New domain-scoped routes using Single Action Classes. These coexist
        | with the legacy routes above. Once fully tested, legacy routes will
        | be retired incrementally.
        */
        require __DIR__.'/domains/01-enterprise-core.php';
        require __DIR__.'/domains/02-commercial.php';
        require __DIR__.'/domains/03-finance.php';
        require __DIR__.'/domains/04-supply-chain.php';
        require __DIR__.'/domains/05-manufacturing.php';
        require __DIR__.'/domains/06-human-capital.php';
        require __DIR__.'/domains/07-projects.php';
        require __DIR__.'/domains/08-assets.php';
        require __DIR__.'/domains/09-intelligence.php';

    });
});
