<?php
namespace App\Middleware;

class AuditLogger {
    public function logRequest() {
        $logDir = __DIR__ . '/../../storage/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }

        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
            'user_id' => $_SESSION['user_id'] ?? 'Guest',
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'payload' => array_map(function($v) { return '***'; }, array_intersect_key($_REQUEST, array_flip(['password', 'token', 'session_token', 'credit_card', 'cvv']))) + array_diff_key($_REQUEST, array_flip(['password', 'token', 'session_token', 'credit_card', 'cvv']))
        ];

        file_put_contents(
            $logDir . '/audit.log',
            json_encode($logData) . PHP_EOL,
            FILE_APPEND
        );
    }
}
