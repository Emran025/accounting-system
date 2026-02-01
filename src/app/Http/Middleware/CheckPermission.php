<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\PermissionService;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $module, string $action = 'view'): Response
    {
        if (!PermissionService::can($module, $action)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied: You do not have permission to ' . $action . ' ' . $module
            ], 403);
        }

        return $next($request);
    }
}
