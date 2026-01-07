<?php
// Main Entry Point

// Normalize 'route' parameter to 'action' for the Router
if (isset($_GET['route']) && !isset($_GET['action'])) {
    $_GET['action'] = $_GET['route'];
}

// Check if it's an API request
if (isset($_GET['action'])) {
    // Forward to the API handler in src/Services
    // We use __DIR__ to ensure we are referencing the file correctly relative to public/index.php
    require_once __DIR__ . '/../src/Services/api.php';
    exit;
}

// Default Frontend Redirect
// If no API action is specified, redirect to the application login
header('Location: views/auth/login.html');
exit;
?>
