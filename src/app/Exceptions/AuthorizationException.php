<?php

namespace App\Exceptions;

use Exception;

/**
 * Authorization Exception
 * 
 * Used when a user attempts to perform an action they don't have permission for.
 * Returns 403 (Forbidden) status code.
 */
class AuthorizationException extends Exception
{
    protected $code = 403;

    /**
     * Create a new authorization exception instance.
     *
     * @param string $message
     * @param int $code
     * @param \Throwable|null $previous
     */
    public function __construct(string $message = "You don't have permission to perform this action.", int $code = 403, ?\Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }

    /**
     * Render the exception as an HTTP response.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function render($request)
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'error_type' => 'authorization',
        ], $this->getCode());
    }
}

