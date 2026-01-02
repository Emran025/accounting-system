<?php

require_once __DIR__ . '/Controller.php';

class CategoriesController extends Controller {

    public function handle() {
        if (!is_logged_in()) {
            $this->errorResponse('Unauthorized', 401);
        }

        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            $this->getCategories();
        } elseif ($method === 'POST') {
            $this->createCategory();
        }
    }

    private function getCategories() {
        $result = mysqli_query($this->conn, "SELECT * FROM categories ORDER BY name ASC");
        $categories = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $categories[] = $row;
        }
        $this->successResponse(['data' => $categories]);
    }

    private function createCategory() {
        $data = $this->getJsonInput();
        $name = mysqli_real_escape_string($this->conn, $data['name'] ?? '');
        
        if (empty($name)) {
            $this->errorResponse('Category name is required', 400);
        }
        
        $stmt = mysqli_prepare($this->conn, "INSERT INTO categories (name) VALUES (?)");
        mysqli_stmt_bind_param($stmt, "s", $name);
        
        if (mysqli_stmt_execute($stmt)) {
            $this->successResponse(['id' => mysqli_insert_id($this->conn)]);
        } else {
            $this->errorResponse(mysqli_error($this->conn));
        }
    }
}
