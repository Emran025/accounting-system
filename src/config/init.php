<?php
// Direct initialization script - run this once to set up the database
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

echo "Database initialization complete!\n";
echo "Default user and 100 products seeded.\n";
