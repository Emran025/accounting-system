<?php
// Enable error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set error handler to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Fatal error: ' . $error['message'] . ' in ' . $error['file'] . ' on line ' . $error['line']
        ]);
    }
});

try {
    require_once 'config.php';
    require_once 'db.php';
    require_once 'auth.php';
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Initialization error: ' . $e->getMessage()]);
    exit;
} catch (Error $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Fatal initialization error: ' . $e->getMessage()]);
    exit;
}

// Add CORS headers to allow credentials
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'http://localhost'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

try {
    start_session();
    error_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " " . ($_SERVER['REQUEST_URI'] ?? '') . " | Session: " . session_id());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Session error: ' . $e->getMessage()]);
    exit;
} catch (Error $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Fatal session error: ' . $e->getMessage()]);
    exit;
}

/**
 * Handle API requests
 */
function handle_api_request() {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    // Login endpoint (no auth required)
    if ($action === 'login' && $method === 'POST') {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
                return;
            }
            
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                echo json_encode(['success' => false, 'message' => 'Username and password are required']);
                return;
            }
            
            // Ensure database is initialized
            $conn = get_db_connection();
            if (!$conn) {
                throw new Exception('Database connection failed');
            }
            
            $result = login($username, $password);
            echo json_encode($result);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        } catch (Error $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Fatal error: ' . $e->getMessage()]);
        }
        return;
    }
    
    // Logout endpoint
    if ($action === 'logout' && $method === 'POST') {
        destroy_session();
        echo json_encode(['success' => true]);
        return;
    }
    
    // Check auth endpoint
    if ($action === 'check' && $method === 'GET') {
        if (is_logged_in()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        }
        return;
    }
    
    // Check auth for all other endpoints
    if (!is_logged_in()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        return;
    }
    
    // Products endpoints
    if ($action === 'products') {
        if ($method === 'GET') {
            get_products();
        } elseif ($method === 'POST') {
            create_product();
        } elseif ($method === 'PUT') {
            update_product();
        } elseif ($method === 'DELETE') {
            delete_product();
        }
        return;
    }
    
    // Purchases endpoints
    if ($action === 'purchases') {
        if ($method === 'GET') {
            get_purchases();
        } elseif ($method === 'POST') {
            create_purchase();
        } elseif ($method === 'PUT') {
            update_purchase();
        } elseif ($method === 'DELETE') {
            delete_purchase();
        }
        return;
    }
    
    // Sales/Invoices endpoints
    if ($action === 'invoices') {
        if ($method === 'GET') {
            get_invoices();
        } elseif ($method === 'POST') {
            create_invoice();
        } elseif ($method === 'DELETE') {
            delete_invoice();
        }
        return;
    }
    
    // Get invoice details
    if ($action === 'invoice_details' && $method === 'GET') {
        $invoice_id = $_GET['id'] ?? 0;
        get_invoice_details($invoice_id);
        return;
    }

    // Categories endpoints
    if ($action === 'categories') {
        if ($method === 'GET') {
            get_categories();
        } elseif ($method === 'POST') {
            create_category();
        }
        return;
    }
    
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Not found']);
}

/**
 * Products CRUD
 */
function get_products() {
    $conn = get_db_connection();
    $include_purchase_price = isset($_GET['include_purchase_price']) && $_GET['include_purchase_price'] == '1';
    
    if ($include_purchase_price) {
        // Get products with latest purchase price
        $result = mysqli_query($conn, "
            SELECT p.*, 
                   (SELECT invoice_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1) as latest_purchase_price
            FROM products p
            ORDER BY p.id DESC
        ");
    } else {
        $result = mysqli_query($conn, "SELECT * FROM products ORDER BY id DESC");
    }
    
    $products = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $products[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $products]);
}

function create_product() {
    $data = json_decode(file_get_contents('php://input'), true);
    $conn = get_db_connection();
    
    $name = mysqli_real_escape_string($conn, $data['name'] ?? '');
    $description = mysqli_real_escape_string($conn, $data['description'] ?? '');
    $category = mysqli_real_escape_string($conn, $data['category'] ?? '');
    $unit_price = floatval($data['unit_price'] ?? 0);
    $min_margin = floatval($data['minimum_profit_margin'] ?? 0);
    $stock = intval($data['stock_quantity'] ?? 0);
    $unit_name = mysqli_real_escape_string($conn, $data['unit_name'] ?? 'كرتون');
    $items_per_unit = intval($data['items_per_unit'] ?? 1);
    $sub_unit_name = mysqli_real_escape_string($conn, $data['sub_unit_name'] ?? 'حبة');
    
    $stmt = mysqli_prepare($conn, "INSERT INTO products (name, description, category, unit_price, minimum_profit_margin, stock_quantity, unit_name, items_per_unit, sub_unit_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "sssddisis", $name, $description, $category, $unit_price, $min_margin, $stock, $unit_name, $items_per_unit, $sub_unit_name);
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode(['success' => true, 'id' => mysqli_insert_id($conn)]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
    mysqli_stmt_close($stmt);
}

function update_product() {
    $data = json_decode(file_get_contents('php://input'), true);
    $conn = get_db_connection();
    
    $id = intval($data['id'] ?? 0);
    $name = mysqli_real_escape_string($conn, $data['name'] ?? '');
    $description = mysqli_real_escape_string($conn, $data['description'] ?? '');
    $category = mysqli_real_escape_string($conn, $data['category'] ?? '');
    $unit_price = floatval($data['unit_price'] ?? 0);
    $min_margin = floatval($data['minimum_profit_margin'] ?? 0);
    $stock = intval($data['stock_quantity'] ?? 0);
    $unit_name = mysqli_real_escape_string($conn, $data['unit_name'] ?? 'كرتون');
    $items_per_unit = intval($data['items_per_unit'] ?? 1);
    $sub_unit_name = mysqli_real_escape_string($conn, $data['sub_unit_name'] ?? 'حبة');
    
    $stmt = mysqli_prepare($conn, "UPDATE products SET name = ?, description = ?, category = ?, unit_price = ?, minimum_profit_margin = ?, stock_quantity = ?, unit_name = ?, items_per_unit = ?, sub_unit_name = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "sssddisisi", $name, $description, $category, $unit_price, $min_margin, $stock, $unit_name, $items_per_unit, $sub_unit_name, $id);
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
    mysqli_stmt_close($stmt);
}

function delete_product() {
    $id = intval($_GET['id'] ?? 0);
    $conn = get_db_connection();
    
    $stmt = mysqli_prepare($conn, "DELETE FROM products WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "i", $id);
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
    mysqli_stmt_close($stmt);
}

/**
 * Categories CRUD
 */
function get_categories() {
    $conn = get_db_connection();
    $result = mysqli_query($conn, "SELECT * FROM categories ORDER BY name ASC");
    $categories = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $categories[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $categories]);
}

function create_category() {
    $data = json_decode(file_get_contents('php://input'), true);
    $conn = get_db_connection();
    $name = mysqli_real_escape_string($conn, $data['name'] ?? '');
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Category name is required']);
        return;
    }
    
    $stmt = mysqli_prepare($conn, "INSERT INTO categories (name) VALUES (?)");
    mysqli_stmt_bind_param($stmt, "s", $name);
    
    if (mysqli_stmt_execute($stmt)) {
        echo json_encode(['success' => true, 'id' => mysqli_insert_id($conn)]);
    } else {
        echo json_encode(['success' => false, 'message' => mysqli_error($conn)]);
    }
    mysqli_stmt_close($stmt);
}

/**
 * Purchases CRUD
 */
function get_purchases() {
    $conn = get_db_connection();
    $result = mysqli_query($conn, "
        SELECT p.*, pr.name as product_name, pr.unit_price as product_unit_price, pr.unit_name, pr.sub_unit_name
        FROM purchases p
        JOIN products pr ON p.product_id = pr.id
        ORDER BY p.purchase_date DESC, p.id DESC
    ");
    $purchases = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $purchases[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $purchases]);
}

function create_purchase() {
    $data = json_decode(file_get_contents('php://input'), true);
    $conn = get_db_connection();
    
    $product_id = intval($data['product_id'] ?? 0);
    $quantity = intval($data['quantity'] ?? 0);
    $total_invoice_price = floatval($data['invoice_price'] ?? 0);
    $unit_type = $data['unit_type'] ?? 'sub'; // 'main' or 'sub'
    $purchase_date = $data['purchase_date'] ?? date('Y-m-d H:i:s');
    
    // Get product details
    $result = mysqli_query($conn, "SELECT items_per_unit, minimum_profit_margin FROM products WHERE id = $product_id");
    $product = mysqli_fetch_assoc($result);
    
    if (!$product) {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        return;
    }
    
    $items_per_unit = intval($product['items_per_unit']);
    $min_margin = floatval($product['minimum_profit_margin']);
    
    // Calculate actual quantity in sub-units
    $actual_quantity = ($unit_type === 'main') ? ($quantity * $items_per_unit) : $quantity;
    
    // Calculate price per item
    $price_per_item = ($actual_quantity > 0) ? ($total_invoice_price / $actual_quantity) : 0;
    
    // New selling price
    $new_unit_price = $price_per_item + $min_margin;
    
    // Start transaction
    mysqli_begin_transaction($conn);
    
    try {
        // Insert purchase
        $stmt = mysqli_prepare($conn, "INSERT INTO purchases (product_id, quantity, invoice_price, purchase_date, unit_type) VALUES (?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, "iidss", $product_id, $quantity, $total_invoice_price, $purchase_date, $unit_type);
        mysqli_stmt_execute($stmt);
        $purchase_id = mysqli_insert_id($conn);
        mysqli_stmt_close($stmt);
        
        // Update product stock and unit price
        $stmt = mysqli_prepare($conn, "UPDATE products SET stock_quantity = stock_quantity + ?, unit_price = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "idi", $actual_quantity, $new_unit_price, $product_id);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        
        mysqli_commit($conn);
        echo json_encode(['success' => true, 'id' => $purchase_id, 'new_unit_price' => $new_unit_price]);
    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function update_purchase() {
    $data = json_decode(file_get_contents('php://input'), true);
    $conn = get_db_connection();
    
    $id = intval($data['id'] ?? 0);
    
    // Check if 24 hours have passed
    $result = mysqli_query($conn, "SELECT purchase_date FROM purchases WHERE id = $id");
    $row = mysqli_fetch_assoc($result);
    if ($row) {
        $purchase_time = strtotime($row['purchase_date']);
        $hours_passed = (time() - $purchase_time) / 3600;
        if ($hours_passed > 24) {
            echo json_encode(['success' => false, 'message' => 'Cannot edit purchase after 24 hours']);
            return;
        }
    }
    
    $product_id = intval($data['product_id'] ?? 0);
    $quantity = intval($data['quantity'] ?? 0);
    $invoice_price = floatval($data['invoice_price'] ?? 0);
    $purchase_date = $data['purchase_date'] ?? date('Y-m-d H:i:s');
    
    // Get old purchase data and product info
    $result = mysqli_query($conn, "
        SELECT p.product_id, p.quantity, p.unit_type, pr.items_per_unit, pr.minimum_profit_margin 
        FROM purchases p 
        JOIN products pr ON p.product_id = pr.id 
        WHERE p.id = $id
    ");
    $old = mysqli_fetch_assoc($result);
    
    mysqli_begin_transaction($conn);
    
    try {
        // Update purchase
        $stmt = mysqli_prepare($conn, "UPDATE purchases SET product_id = ?, quantity = ?, invoice_price = ?, purchase_date = ?, unit_type = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "iidssi", $product_id, $quantity, $invoice_price, $purchase_date, $unit_type, $id);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        
        if ($old) {
            $old_product_id = $old['product_id'];
            $old_quantity = intval($old['quantity']);
            $old_unit_type = $old['unit_type'];
            $old_items_per_unit = intval($old['items_per_unit']);
            
            // Calculate old actual quantity
            $old_actual_qty = ($old_unit_type === 'main') ? ($old_quantity * $old_items_per_unit) : $old_quantity;
            
            // Remove old quantity from stock
            $stmt = mysqli_prepare($conn, "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
            mysqli_stmt_bind_param($stmt, "ii", $old_actual_qty, $old_product_id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
            
            // Get current product info for new product (in case it changed)
            $result = mysqli_query($conn, "SELECT items_per_unit, minimum_profit_margin FROM products WHERE id = $product_id");
            $new_prod = mysqli_fetch_assoc($result);
            $new_items_per_unit = intval($new_prod['items_per_unit']);
            
            // Calculate new actual quantity
            $new_actual_qty = ($unit_type === 'main') ? ($quantity * $new_items_per_unit) : $quantity;
            
            // Calculate new price per item and update unit_price
            $price_per_item = ($new_actual_qty > 0) ? ($invoice_price / $new_actual_qty) : 0;
            $new_unit_price = $price_per_item + floatval($new_prod['minimum_profit_margin']);
            
            // Add new quantity to stock and update price
            $stmt = mysqli_prepare($conn, "UPDATE products SET stock_quantity = stock_quantity + ?, unit_price = ? WHERE id = ?");
            mysqli_stmt_bind_param($stmt, "idi", $new_actual_qty, $new_unit_price, $product_id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        
        mysqli_commit($conn);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function delete_purchase() {
    $id = intval($_GET['id'] ?? 0);
    $conn = get_db_connection();
    
    // Get purchase data and check time
    $result = mysqli_query($conn, "
        SELECT p.product_id, p.quantity, p.purchase_date, p.unit_type, pr.items_per_unit 
        FROM purchases p 
        JOIN products pr ON p.product_id = pr.id 
        WHERE p.id = $id
    ");
    $purchase = mysqli_fetch_assoc($result);
    
    if ($purchase) {
        if (time() - strtotime($purchase['purchase_date']) > 86400) {
            echo json_encode(['success' => false, 'message' => 'لا يمكن حذف المشتريات بعد مرور 24 ساعة']);
            return;
        }
    }
    
    mysqli_begin_transaction($conn);
    try {
        $stmt = mysqli_prepare($conn, "DELETE FROM purchases WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "i", $id);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        
        if ($purchase) {
            $actual_qty = ($purchase['unit_type'] === 'main') ? (intval($purchase['quantity']) * intval($purchase['items_per_unit'])) : intval($purchase['quantity']);
            mysqli_query($conn, "UPDATE products SET stock_quantity = stock_quantity - $actual_qty WHERE id = " . intval($purchase['product_id']));
        }
        
        mysqli_commit($conn);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

/**
 * Invoices CRUD
 */
function get_invoices() {
    $conn = get_db_connection();
    $result = mysqli_query($conn, "
        SELECT i.*, COUNT(ii.id) as item_count
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        GROUP BY i.id
        ORDER BY i.created_at DESC
    ");
    $invoices = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $invoices[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $invoices]);
}

function get_invoice_details($invoice_id) {
    $conn = get_db_connection();
    $invoice_id = intval($invoice_id);
    
    // Get invoice
    $result = mysqli_query($conn, "SELECT * FROM invoices WHERE id = $invoice_id");
    $invoice = mysqli_fetch_assoc($result);
    
    if (!$invoice) {
        echo json_encode(['success' => false, 'message' => 'Invoice not found']);
        return;
    }
    
    // Get invoice items
    $result = mysqli_query($conn, "
        SELECT ii.*, p.name as product_name
        FROM invoice_items ii
        JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = $invoice_id
    ");
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $items[] = $row;
    }
    
    $invoice['items'] = $items;
    echo json_encode(['success' => true, 'data' => $invoice]);
}

function create_invoice() {
    $data = json_decode(file_get_contents('php://input'), true);
    $conn = get_db_connection();
    
    $invoice_number = mysqli_real_escape_string($conn, $data['invoice_number'] ?? '');
    $items = $data['items'] ?? [];
    
    if (empty($items)) {
        echo json_encode(['success' => false, 'message' => 'Invoice must have at least one item']);
        return;
    }
    
    mysqli_begin_transaction($conn);
    
    try {
        // Calculate total
        $total = 0;
        foreach ($items as $item) {
            $subtotal = floatval($item['quantity']) * floatval($item['unit_price']);
            $total += $subtotal;
        }
        
        // Create invoice
        $stmt = mysqli_prepare($conn, "INSERT INTO invoices (invoice_number, total_amount) VALUES (?, ?)");
        mysqli_stmt_bind_param($stmt, "sd", $invoice_number, $total);
        mysqli_stmt_execute($stmt);
        $invoice_id = mysqli_insert_id($conn);
        mysqli_stmt_close($stmt);
        
        // Create invoice items and update stock
        foreach ($items as $item) {
            $product_id = intval($item['product_id']);
            $quantity = intval($item['quantity']);
            $unit_price = floatval($item['unit_price']);
            $subtotal = $quantity * $unit_price;
            
            // Insert invoice item
            $stmt = mysqli_prepare($conn, "INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
            mysqli_stmt_bind_param($stmt, "iiidd", $invoice_id, $product_id, $quantity, $unit_price, $subtotal);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
            
            // Update stock
            $stmt = mysqli_prepare($conn, "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
            mysqli_stmt_bind_param($stmt, "ii", $quantity, $product_id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        
        mysqli_commit($conn);
        echo json_encode(['success' => true, 'id' => $invoice_id, 'invoice_number' => $invoice_number]);
    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function delete_invoice() {
    $id = intval($_GET['id'] ?? 0);
    $conn = get_db_connection();
    
    // Check if 48 hours have passed
    $result = mysqli_query($conn, "SELECT created_at FROM invoices WHERE id = $id");
    $row = mysqli_fetch_assoc($result);
    if ($row) {
        $invoice_time = strtotime($row['created_at']);
        $hours_passed = (time() - $invoice_time) / 3600;
        if ($hours_passed > 48) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete invoice after 48 hours']);
            return;
        }
    }
    
    // Get invoice items to restore stock
    $result = mysqli_query($conn, "SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $id");
    $items = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $items[] = $row;
    }
    
    mysqli_begin_transaction($conn);
    
    try {
        // Delete invoice (cascade will delete items)
        $stmt = mysqli_prepare($conn, "DELETE FROM invoices WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "i", $id);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
        
        // Restore stock
        foreach ($items as $item) {
            $stmt = mysqli_prepare($conn, "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?");
            mysqli_stmt_bind_param($stmt, "ii", $item['quantity'], $item['product_id']);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        
        mysqli_commit($conn);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Handle the request
handle_api_request();
?>

