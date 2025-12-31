# Backend Documentation

## Overview
The backend is a lightweight PHP-based API service. It acts as the intermediary between the frontend and the database, ensuring all business rules are enforced and data integrity is maintained.

## Backend Architecture
The backend follows a functional approach, organized into specific service layers:
- **API Entry Point (`api.php`)**: Routes incoming HTTP requests to the appropriate functions based on the `action` parameter.
- **Authentication Layer (`auth.php`)**: Manages sessions, user validation, and security tokens.
- **Database Layer (`db.php`)**: Handles PDO/MySQLi connections, table initializations, and seeding.
- **Config Layer (`config.php`)**: Standardized environment variables and constants.

## Responsibilities
- **Request Routing**: Validates the HTTP method (GET, POST, PUT, DELETE) and the `action`.
- **Authorization**: Ensures only authenticated users can access management endpoints.
- **Transaction Management**: Uses SQL transactions for complex operations like "Create Invoice" to ensure either the whole operation succeeds (inserting items and decreasing stock) or none of it does.
- **Security**: Implements login throttling and session expiration.

## Authentication & Authorization
- **Session-Based**: Uses a custom `sessions` table to track active users.
- **Tokenization**: A unique `session_token` is generated upon login and verified for every subsequent request.
- **Protection**: Includes a `login_attempts` tracker to mitigate brute-force attacks by locking accounts temporarily after repeated failures.

## Error Handling Strategy
- **HTTP Status Codes**:
    - `200 OK`: Successful operation.
    - `401 Unauthorized`: Authentication required or session expired.
    - `404 Not Found`: Endpoint or resource does not exist.
    - `500 Internal Server Error`: Critical failure or unhandled exception.
- **Standardized Response**: All API responses follow a uniform JSON structure:
    ```json
    {
      "success": true/false,
      "message": "Human-readable message",
      "data": [] // Optional payload
    }
    ```

## Technologies and Patterns used
- **PHP 8.x**: For server-side logic.
- **MariaDB/MySQL**: Relational storage.
- **CORS Management**: Middleware logic to handle cross-origin requests.
- **Singleton Database Connection**: Ensures efficient resource usage by reusing a single connection per request.
