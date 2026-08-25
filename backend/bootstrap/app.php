<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \App\Http\Middleware\NegotiateApiLocale::class,
        ]);

        $middleware->alias([
            'api.auth' => \App\Http\Middleware\ApiAuth::class,
            'can' => \App\Http\Middleware\CheckPermission::class,
            'module.operational' => \App\Http\Middleware\EnsureModuleOperational::class,
            'marketplace.inbound.signature' => \App\Http\Middleware\VerifyMarketplaceInboundSignature::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
