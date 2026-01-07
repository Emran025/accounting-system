<?php

abstract class Controller {
    protected $conn;

    public function __construct() {
        $this->conn = get_db_connection();
    }

    protected function jsonResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }

    protected function errorResponse($message, $statusCode = 500) {
        $this->jsonResponse(['success' => false, 'message' => $message], $statusCode);
    }

    protected function successResponse($data = [], $message = '') {
        $response = ['success' => true];
        if (!empty($data)) {
            $response = array_merge($response, $data);
        }
        if (!empty($message)) {
            $response['message'] = $message;
        }
        $this->jsonResponse($response);
    }

    protected function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [];
        }
        return $input;
    }

    protected function requireMethod($method) {
        if ($_SERVER['REQUEST_METHOD'] !== $method) {
            $this->errorResponse('Method Not Allowed', 405);
        }
    }

    protected function getPaginationParams() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;

        if ($page < 1) $page = 1;
        if ($limit < 1) $limit = 20;
        if ($limit > 100) $limit = 100; // Cap limit

        $offset = ($page - 1) * $limit;
        
        return ['page' => $page, 'limit' => $limit, 'offset' => $offset];
    }

    protected function paginatedResponse($data, $total, $page, $limit) {
        $this->successResponse([
            'data' => $data,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
    }
}
