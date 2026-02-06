<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

trait BaseApiController
{
    protected function successResponse($data = [], string $message = ''): JsonResponse
    {
        $response = ['success' => true];

        if (!empty($data)) {
            if (is_array($data) && !isset($data[0])) {
                $response = array_merge($response, $data);
            } else {
                $response['data'] = $data;
            }
        }

        if (!empty($message)) {
            $response['message'] = $message;
        }

        return response()->json($response);
    }

    protected function errorResponse(string $message, int $statusCode = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message
        ], $statusCode);
    }

    protected function paginatedResponse($data, int $total, int $page, int $perPage): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_records' => $total,
                'total_pages' => ceil($total / $perPage),
            ],
        ]);
    }
}
