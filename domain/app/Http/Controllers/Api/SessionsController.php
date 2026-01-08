<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Session;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SessionsController extends Controller
{
    use BaseApiController;

    public function index(Request $request): JsonResponse
    {
        // Require at least being logged in
        $userId = auth()->id();
        if (!$userId) {
            return $this->errorResponse('Unauthorized', 401);
        }

        $limit = $request->query('limit', 10);
        
        $sessionsQuery = Session::where('user_id', $userId)
            ->orderBy('created_at', 'desc');
            
        $total = $sessionsQuery->count();
        $sessions = $sessionsQuery->paginate($limit);

        $mappedSessions = collect($sessions->items())->map(function ($session) {
            return [
                'id' => $session->id,
                'device' => $this->parseUserAgent($session->user_agent),
                'ip_address' => $session->ip_address,
                'last_activity' => $session->created_at, // Using created_at as last activity for now
                'is_current' => $session->session_token === request()->header('X-Session-Token'),
            ];
        });

        return response()->json([
            'success' => true,
            'sessions' => $mappedSessions,
            'total' => $total,
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $userId = auth()->id();
        $session = Session::where('id', $id)->where('user_id', $userId)->firstOrFail();
        
        // Don't allow deleting current session through this endpoint for safety, 
        // or handle it if necessary. Frontend usually has a separate logout.
        if ($session->session_token === request()->header('X-Session-Token')) {
            return $this->errorResponse('Cannot terminate current session here', 400);
        }

        $session->delete();

        return $this->successResponse([], 'Session terminated');
    }

    private function parseUserAgent($ua): string
    {
        if (empty($ua)) return 'Unknown Device';
        
        if (str_contains($ua, 'Mobi')) return 'Mobile Device';
        if (str_contains($ua, 'Tablet')) return 'Tablet';
        
        if (str_contains($ua, 'Windows')) return 'Windows PC';
        if (str_contains($ua, 'Macintosh')) return 'Mac';
        if (str_contains($ua, 'Linux')) return 'Linux PC';
        
        return 'Desktop Device';
    }
}
