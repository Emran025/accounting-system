<?php

namespace App\Exceptions;

use Exception;

/**
 * Business Logic Exception
 * 
 * Used for business rule violations that should return 400 (Bad Request)
 * rather than 500 (Internal Server Error).
 * 
 * Examples:
 * - Insufficient inventory
 * - Price below minimum
 * - Invalid fiscal period operations
 */
class BusinessLogicException extends Exception
{
    protected $code = 400;

    /**
     * Create a new business logic exception instance.
     *
     * @param string $message
     * @param int $code
     * @param \Throwable|null $previous
     */
    public function __construct(string $message = "", int $code = 400, ?\Throwable $previous = null)
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
            'error_type' => 'business_logic',
        ], $this->getCode());
    }
}

