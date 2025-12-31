# API Overview

## Structure
The API is accessible through a single entry point: `domain/api.php`. Operations are determined by the `action` query parameter and the HTTP method.

**Base URL**: `/domain/api.php`

## Authentication
Most endpoints require a valid session.
- **Header**: Requests should include any necessary cookie-based credentials (CORS-enabled).
- **Status 401**: Returned if the user is not logged in.

## Endpoints

### 1. Authentication
| Action | Method | Description |
| :--- | :--- | :--- |
| `login` | `POST` | Authenticates user and starts session. |
| `logout`| `POST` | Destroys the current session. |
| `check` | `GET` | Validates if the user is currently logged in. |

### 2. Products (`?action=products`)
| Method | Description |
| :--- | :--- |
| `GET` | Retrieve list of all products. |
| `POST` | Create a new product. |
| `PUT` | Update an existing product. |
| `DELETE`| Remove a product (by `id`). |

### 3. Purchases (`?action=purchases`)
| Method | Description |
| :--- | :--- |
| `GET` | Retrieve purchase history. |
| `POST` | Record a new stock purchase and update product price/stock. |
| `DELETE`| Remove a purchase (restricted to last 24h). |

### 4. Invoices/Sales (`?action=invoices`)
| Method | Description |
| :--- | :--- |
| `GET` | Retrieve sales history. |
| `POST` | Create a new sale invoice and decrease stock. |
| `DELETE`| Revoke an invoice (restricted to last 48h). |

### 5. Categories (`?action=categories`)
| Method | Description |
| :--- | :--- |
| `GET` | List all available product categories. |
| `POST` | Add a new category. |

## Request/Response Formats

### Request (JSON)
For `POST` and `PUT` requests, data must be sent as a JSON object in the request body.
```json
{
  "name": "Coca Cola",
  "unit_price": 1.5,
  ...
}
```

### Response (JSON)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": [ ... ], // Optional
  "id": 123 // Optional (for creation)
}
```

## Status Codes
- `200`: Success.
- `401`: Unauthorized access.
- `404`: Action not found.
- `500`: Server/SQL error.
