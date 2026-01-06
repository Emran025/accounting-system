<?php

require_once __DIR__ . '/Controller.php';

class AssetsController extends Controller {

    public function handle() {
        if (!is_logged_in()) {
            $this->errorResponse('Unauthorized', 401);
        }

        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            $this->getAssets();
        } elseif ($method === 'POST') {
            $this->createAsset();
        } elseif ($method === 'PUT') {
            $this->updateAsset();
        } elseif ($method === 'DELETE') {
            $this->deleteAsset();
        }
    }

    private function getAssets() {
        $params = $this->getPaginationParams();
        $limit = $params['limit'];
        $offset = $params['offset'];
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        $whereClause = "";
        if (!empty($search)) {
            $searchSafe = mysqli_real_escape_string($this->conn, $search);
            $whereClause = "WHERE name LIKE '%$searchSafe%' OR description LIKE '%$searchSafe%' OR status LIKE '%$searchSafe%'";
        }

        // Total count
        $countSql = "SELECT COUNT(*) as total FROM assets $whereClause";
        $countResult = mysqli_query($this->conn, $countSql);
        $total = mysqli_fetch_assoc($countResult)['total'];

        $sql = "
            SELECT a.*, u.username as recorder_name
            FROM assets a
            LEFT JOIN users u ON a.created_by = u.id
            $whereClause
            ORDER BY a.purchase_date DESC, a.id DESC
            LIMIT $limit OFFSET $offset
        ";

        $result = mysqli_query($this->conn, $sql);
        if (!$result) {
            $this->errorResponse(mysqli_error($this->conn));
            return;
        }

        $assets = [];
        while ($row = mysqli_fetch_assoc($result)) {
            $assets[] = $row;
        }
        $this->paginatedResponse($assets, $total, $params['page'], $params['limit']);
    }

    private function createAsset() {
        $data = $this->getJsonInput();
        
        $name = $data['name'] ?? '';
        $value = floatval($data['value'] ?? 0);
        $purchase_date = $data['purchase_date'] ?? date('Y-m-d');
        $depreciation_rate = floatval($data['depreciation_rate'] ?? 0);
        $description = $data['description'] ?? '';
        $status = $data['status'] ?? 'active';
        $user_id = $_SESSION['user_id'];

        if (empty($name) || $value <= 0) {
            $this->errorResponse('Asset name and positive value required');
        }

        $stmt = mysqli_prepare($this->conn, "INSERT INTO assets (name, value, purchase_date, depreciation_rate, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, "sdssssi", $name, $value, $purchase_date, $depreciation_rate, $description, $status, $user_id);
        
        if (mysqli_stmt_execute($stmt)) {
            $id = mysqli_insert_id($this->conn);
            log_operation('CREATE', 'assets', $id, null, $data);
            $this->successResponse(['id' => $id]);
        } else {
            $this->errorResponse('Failed to create asset');
        }
    }

    private function updateAsset() {
        $data = $this->getJsonInput();
        $id = intval($data['id'] ?? 0);
        
        $name = $data['name'] ?? '';
        $value = floatval($data['value'] ?? 0);
        $purchase_date = $data['purchase_date'] ?? date('Y-m-d');
        $depreciation_rate = floatval($data['depreciation_rate'] ?? 0);
        $description = $data['description'] ?? '';
        $status = $data['status'] ?? 'active';

        if (empty($name) || $value <= 0) {
            $this->errorResponse('Asset name and positive value required');
        }

        // Get old values for logging
        $old_res = mysqli_query($this->conn, "SELECT * FROM assets WHERE id = $id");
        $old_data = mysqli_fetch_assoc($old_res);

        $stmt = mysqli_prepare($this->conn, "UPDATE assets SET name = ?, value = ?, purchase_date = ?, depreciation_rate = ?, description = ?, status = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "sdssssi", $name, $value, $purchase_date, $depreciation_rate, $description, $status, $id);
        
        if (mysqli_stmt_execute($stmt)) {
            log_operation('UPDATE', 'assets', $id, $old_data, $data);
            $this->successResponse();
        } else {
            $this->errorResponse('Failed to update asset');
        }
    }

    private function deleteAsset() {
        $id = intval($_GET['id'] ?? 0);
        
        // Get old values for logging
        $old_res = mysqli_query($this->conn, "SELECT * FROM assets WHERE id = $id");
        $old_data = mysqli_fetch_assoc($old_res);

        $stmt = mysqli_prepare($this->conn, "DELETE FROM assets WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "i", $id);
        
        if (mysqli_stmt_execute($stmt)) {
            log_operation('DELETE', 'assets', $id, $old_data);
            $this->successResponse();
        } else {
            $this->errorResponse('Failed to delete asset');
        }
    }
}
