<?php
namespace App\Middleware;

class AuthMiddleware {
    public function handle() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }

    public function requireRole($role) {
        $this->handle();
        if ($_SESSION['role'] !== $role && $_SESSION['role'] !== 'admin') {
             http_response_code(403);
             echo json_encode(['error' => 'Forbidden']);
             exit;
        }
    }
}
