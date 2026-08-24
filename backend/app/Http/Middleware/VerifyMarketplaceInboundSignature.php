<?php

namespace App\Http\Middleware;

use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyMarketplaceInboundSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = (string) config('marketplace.inbound_signing_key');
        if (! config('marketplace.enabled') || blank($key)) {
            abort(503, 'Marketplace inbound integration is not configured.');
        }

        $eventId = (string) $request->header('X-Operational-Event-ID');
        $timestamp = (string) $request->header('X-Operational-Timestamp');
        $keyId = (string) $request->header('X-Operational-Key-ID');
        $signature = (string) $request->header('X-Operational-Signature');

        if (blank($eventId) || blank($timestamp) || blank($signature) || $keyId !== (string) config('marketplace.inbound_key_id')) {
            abort(401, 'Marketplace integration signature headers are incomplete.');
        }

        try {
            $issuedAt = CarbonImmutable::parse($timestamp);
        } catch (\Throwable) {
            abort(401, 'Marketplace integration timestamp is invalid.');
        }

        if ($issuedAt->diffInSeconds(now()) > max(1, (int) config('marketplace.inbound_max_age_seconds', 300))) {
            abort(401, 'Marketplace integration request has expired.');
        }

        $body = $request->getContent();
        $canonical = implode("\n", [
            strtoupper($request->method()),
            $request->getPathInfo(),
            $timestamp,
            $eventId,
            hash('sha256', $body),
        ]);
        $expected = 'sha256='.hash_hmac('sha256', $canonical, $key);

        if (! hash_equals($expected, $signature)) {
            abort(401, 'Marketplace integration signature is invalid.');
        }

        $request->attributes->set('marketplace.remote_event_id', $eventId);

        return $next($request);
    }
}
