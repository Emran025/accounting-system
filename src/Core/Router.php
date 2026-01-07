<?php

class Router {
    private $routes = [];

    public function register($action, $controllerClass) {
        $this->routes[$action] = $controllerClass;
    }

    public function dispatch() {
        $action = $_GET['action'] ?? '';
        
        if (empty($action)) {
            $this->sendNotFound();
            return;
        }

        if (array_key_exists($action, $this->routes)) {
            $controllerClass = $this->routes[$action];
            $controller = new $controllerClass();
            
            // Check if the controller has a handle method
            if (method_exists($controller, 'handle')) {
                $controller->handle();
            } else {
                // If not, assume it's a specific method mapping or default handling
                // For simplicity in this refactor, we'll expect controllers to have a handle() request
                // or we could map specific actions to methods within a controller.
                // Let's assume standard 'handle' for now which inspects request method.
                $controller->handle();
            }
        } else {
            $this->sendNotFound();
        }
    }

    private function sendNotFound() {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Endpoint not found']);
        exit;
    }
}
