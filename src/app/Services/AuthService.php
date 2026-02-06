<?php

namespace App\Services;

use App\Models\User;
use App\Models\Session;
use App\Models\LoginAttempt;
use App\Services\PermissionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session as SessionFacade;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Service for managing user authentication, session lifecycle, and login throttling.
 * Implements brute-force protection via progressive lockouts.
 */
class AuthService
{
    /** @var int Session lifetime in seconds (1 hour) */
    private const SESSION_LIFETIME = 3600;
    /** @var int Maximum failed login attempts before lockout */
    private const MAX_LOGIN_ATTEMPTS = 3;
    /** @var int Base lockout time in seconds (increases with subsequent failures) */
    private const THROTTLE_BASE_TIME = 60;

    /**
     * Attempt to authenticate a user.
     * Validates credentials, checks for account lockout, and creates a session on success.
     * 
     * @param string $username
     * @param string $password
     * @return array{success: bool, session_token?: string, user_id?: int, message?: string}
     */
    public function login(string $username, string $password): array
    {
        // Check throttling
        $throttle = $this->checkThrottle($username);
        if ($throttle['locked']) {
            return [
                'success' => false,
                'message' => 'Account locked. Please wait ' . ceil($throttle['wait_time'] / 60) . ' minutes before trying again.'
            ];
        }


        if (Auth::attempt([ 'username' => $username , 'password' => $password])) {
            $user = Auth::user();
            if (!$user->is_active) {
                Auth::logout();
                return [
                    'success' => false,
                    'message' => 'Account is inactive'
                ];
            }

            $this->clearFailedAttempts($username);
            $sessionToken = $this->createSession($user);
            
            return [
                'success' => true,
                'session_token' => $sessionToken,
                'user_id' => $user->id
            ];
        } else {
            $this->recordFailedAttempt($username);
            return [
                'success' => false,
                'message' => 'Invalid username or password'
            ];
        }
    }

    /**
     * Terminate a user session.
     * 
     * @param string $sessionToken The session token to invalidate
     * @return void
     */
    public function logout(string $sessionToken): void
    {
        Session::where('session_token', $sessionToken)->delete();
        SessionFacade::flush();
    }

    /**
     * Validate an existing session and return the associated user.
     * Reloads permissions from database on each check.
     * 
     * @param string|null $sessionToken Optional token (falls back to session store)
     * @return User|null The authenticated user, or null if session is invalid/expired
     */
    public function checkSession(?string $sessionToken = null): ?User
    {
        if (!$sessionToken) {
            $sessionToken = SessionFacade::get('session_token');
        }

        if (!$sessionToken) {
            return null;
        }

        $session = Session::where('session_token', $sessionToken)
            ->where('expires_at', '>', now())
            ->with('user')
            ->first();

        if ($session && $session->user) {
            // Reload permissions
            $permissions = PermissionService::loadPermissions($session->user->role_id);
            SessionFacade::put('permissions', $permissions);
        }

        return $session?->user;
    }

    private function createSession(User $user): string
    {
        $sessionToken = bin2hex(random_bytes(32));
        $expiresAt = now()->addSeconds(self::SESSION_LIFETIME);

        Session::create([
            'user_id' => $user->id,
            'session_token' => $sessionToken,
            'expires_at' => $expiresAt,
            'ip_address' => request()->ip(),
            'user_agent' => substr(request()->userAgent() ?? '', 0, 255),
        ]);

        // Load permissions
        $permissions = PermissionService::loadPermissions($user->role_id);

        // Store in session
        SessionFacade::put([
            'user_id' => $user->id,
            'session_token' => $sessionToken,
            'role_id' => $user->role_id,
            'role_key' => $user->roleRelation?->role_key ?? $user->role ?? 'cashier',
            'permissions' => $permissions,
        ]);

        return $sessionToken;
    }

    private function checkThrottle(string $username): array
    {
        $attempt = LoginAttempt::where('username', $username)->first();

        if (!$attempt) {
            return ['locked' => false];
        }

        if ($attempt->locked_until && Carbon::parse($attempt->locked_until)->isFuture()) {
            $waitTime = Carbon::parse($attempt->locked_until)->diffInSeconds(now());
            return [
                'locked' => true,
                'wait_time' => $waitTime
            ];
        }

        return ['locked' => false];
    }

    private function recordFailedAttempt(string $username): void
    {
        $attempt = LoginAttempt::where('username', $username)->first();

        if ($attempt) {
            $attempts = $attempt->attempts + 1;

            if ($attempts >= self::MAX_LOGIN_ATTEMPTS) {
                $lockMultiplier = $attempts - self::MAX_LOGIN_ATTEMPTS + 1;
                $lockSeconds = self::THROTTLE_BASE_TIME * $lockMultiplier;
                $lockedUntil = now()->addSeconds($lockSeconds);

                $attempt->update([
                    'attempts' => $attempts,
                    'last_attempt' => now(),
                    'locked_until' => $lockedUntil,
                ]);
            } else {
                $attempt->update([
                    'attempts' => $attempts,
                    'last_attempt' => now(),
                ]);
            }
        } else {
            LoginAttempt::create([
                'username' => $username,
                'attempts' => 1,
                'last_attempt' => now(),
            ]);
        }
    }

    private function clearFailedAttempts(string $username): void
    {
        LoginAttempt::where('username', $username)->delete();
    }
}

