# API Reference Guide

> **RESTful API Documentation for Accounting System**  
> Base URL: `http://localhost:8000/api`

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Sales & Invoicing](#sales--invoicing)
4. [Purchases Management](#purchases-management)
5. [Inventory & Products](#inventory--products)
6. [Accounts Receivable (AR)](#accounts-receivable-ar)
7. [Accounts Payable (AP)](#accounts-payable-ap)
8. [General Ledger](#general-ledger)
9. [Financial Reports](#financial-reports)
10. [HR & Payroll](#hr--payroll)
11. [System Administration](#system-administration)
12. [Multi-Currency](#multi-currency)
13. [Error Handling](#error-handling)

---

## Getting Started

### Base URL

```txt
Development: http://localhost:8000/api
Production: https://api.yourdomain.com/api
```

### Request Headers

```http
Content-Type: application/json
X-Session-Token: {your_session_token}
```

### Response Format

All responses follow this structure:

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Paginated Response:**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_records": 100,
    "total_pages": 5
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": ["Validation error"]
  }
}
```

### HTTP Status Codes

- `200 OK` - Successful request
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication

### POST `/login` {#auth-login}

Authenticate user and obtain session token.

**Request:**

```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "session_token": "abc123def456...",
  "user": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrator",
    "role": "admin",
    "role_id": 1,
    "permissions": {
      "sales": { "view": true, "create": true, "edit": true, "delete": true },
      "purchases": { "view": true, "create": true, "edit": true, "delete": true }
    }
  }
}
```

**Error Responses:**

- `401` - Invalid credentials

---

### POST `/logout` {#auth-logout}

Terminate current session.

**Headers:**

```txt
X-Session-Token: abc123def456...
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET `/check` {#auth-check}

Verify current session status.

**Headers:**

```txt
X-Session-Token: abc123def456...
```

**Response:**

```json
{
  "authenticated": true,
  "user": { ... }
}
```

**Error Responses:**

- `401` - Session expired or invalid

---

## Sales & Invoicing

### GET `/invoices` {#invoices-list}

Retrieve paginated list of invoices.

**Query Parameters:**

| Parameter | Type | Required | Description |
| ----------- | ------ | ---------- | ------------- |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (default: 20, max: 100) |
| `payment_type` | string | No | Filter by 'cash' or 'credit' |
| `customer_id` | integer | No | Filter by customer ID |

**Example Request:**

```txt
GET /invoices?page=1&per_page=20&payment_type=cash
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoice_number": "INV-00001",
      "total_amount": 115.00,
      "payment_type": "cash",
      "customer_id": null,
      "customer_name": null,
      "amount_paid": 115.00,
      "user_id": 1,
      "cashier_name": "admin",
      "created_at": "2026-01-09T10:30:00.000000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_records": 150,
    "total_pages": 8
  }
}
```

**Permissions Required:** `sales.view`

---

### POST `/invoices` {#invoices-create}

Create a new invoice (sales transaction).

**Request Body:**

```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_type": "sub",
      "unit_price": 50.00
    },
    {
      "product_id": 2,
      "quantity": 1,
      "unit_type": "main",
      "unit_price": 100.00
    }
  ],
  "payment_type": "cash",
  "customer_id": null,
  "discount_amount": 10.00,
  "amount_paid": 190.00,
  "currency_id": 1,
  "exchange_rate": 1.00
}
```

**Field Descriptions:**

- `items` - Array of invoice items (required, min: 1)
- `items[].product_id` - Product ID (required, must exist)
- `items[].quantity` - Quantity (required, min: 1)
- `items[].unit_type` - 'main' or 'sub' (required)
- `items[].unit_price` - Price per unit (required)
- `payment_type` - 'cash' or 'credit' (required)
- `customer_id` - Customer ID (required if payment_type='credit')
- `discount_amount` - Discount (optional, default: 0)
- `amount_paid` - Amount paid (required for cash, optional for credit)
- `currency_id` - Currency ID (optional)
- `exchange_rate` - Exchange rate (optional)

**Response:**

```json
{
  "success": true,
  "id": 123,
  "invoice_id": 123
}
```

**Business Logic:**

1. Validates all products exist and have sufficient stock
2. Calculates subtotal, VAT, total
3. Reduces product stock quantities
4. Creates inventory costing records
5. Posts to AR ledger (if credit sale)
6. Posts GL entries:
   - DR: Cash/AR
   - CR: Sales Revenue
   - DR: COGS
   - CR: Inventory

**Permissions Required:** `sales.create`

---

### GET `/invoice_details` {#invoices-show}

Get detailed invoice information.

**Query Parameters:**

| Parameter | Type | Required |
| ----------- | ------ | ---------- |
| `id` | integer | Yes |

**Example Request:**

```txt
GET /invoice_details?id=123
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "invoice_number": "INV-00123",
    "voucher_number": "JV-00045",
    "total_amount": 200.00,
    "subtotal": 180.00,
    "vat_rate": 15.00,
    "vat_amount": 27.00,
    "discount_amount": 7.00,
    "payment_type": "cash",
    "customer_id": null,
    "amount_paid": 200.00,
    "user_id": 1,
    "is_reversed": false,
    "created_at": "2026-01-09T10:30:00.000000Z",
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product": {
          "id": 1,
          "name": "Product A"
        },
        "quantity": 2,
        "unit_type": "sub",
        "unit_price": 50.00,
        "subtotal": 100.00
      }
    ],
    "user": {
      "id": 1,
      "username": "admin"
    },
    "customer": null,
    "zatcaEinvoice": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "qr_code": "base64encodedstring...",
      "submission_status": "pending"
    }
  }
}
```

**Permissions Required:** `sales.view`

---

### DELETE `/invoices` {#invoices-delete}

Delete (reverse) an invoice.

**Request Body:**

```json
{
  "id": 123
}
```

**Response:**

```json
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

**Business Logic:**

1. Marks invoice as `is_reversed=true`
2. Restores product stock quantities
3. Reverses AR transaction (if credit sale)
4. Creates reversing GL entries

**Permissions Required:** `sales.delete`

---

### POST `/invoices/{id}/zatca/submit` {#zatca-submit}

Submit invoice to ZATCA for e-invoicing compliance.

**Response:**

```json
{
  "success": true,
  "submission_status": "submitted",
  "zatca_response": { ... }
}
```

---

### GET `/invoices/{id}/zatca/status` {#zatca-status}

Get ZATCA submission status.

**Response:**

```json
{
  "success": true,
  "status": "approved",
  "response": { ... }
}
```

---

## Purchases Management

### GET `/purchases` {#purchases-list}

Retrieve paginated list of purchases.

**Query Parameters:**

| Parameter | Type | Description |
| ----------- | ------ | ------------- |
| `page` | integer | Page number |
| `per_page` | integer | Items per page |
| `approval_status` | string | 'pending', 'approved', 'rejected' |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Product A",
      "quantity": 100,
      "unit_type": "main",
      "invoice_price": 5000.00,
      "supplier": "ABC Suppliers",
      "voucher_number": "PO-001",
      "approval_status": "approved",
      "purchase_date": "2026-01-09T10:00:00.000000Z",
      "created_at": "2026-01-09T09:30:00.000000Z"
    }
  ],
  "pagination": { ... }
}
```

**Permissions Required:** `purchases.view`

---

### POST `/purchases` {#purchases-create}

Create a new purchase transaction.

**Request Body:**

```json
{
  "product_id": 1,
  "quantity": 100,
  "invoice_price": 5000.00,
  "unit_type": "main",
  "supplier": "ABC Suppliers",
  "voucher_number": "PO-001",
  "production_date": "2026-01-01",
  "expiry_date": "2027-01-01",
  "vat_rate": 15,
  "vat_amount": 750.00,
  "notes": "Bulk order"
}
```

**Response:**

```json
{
  "success": true,
  "id": 123,
  "message": "Purchase created successfully"
}
```

**Business Logic:**

1. Creates purchase record with status based on amount
   - < 5000: approved automatically
   - >= 5000: pending approval
2. If auto-approved:
   - Increases product stock
   - Posts to AP ledger
   - Creates GL entries
3. If pending: Awaits approval

**Permissions Required:** `purchases.create`

---

### POST `/purchases/approve` {#purchases-approve}

Approve a pending purchase.

**Request Body:**

```json
{
  "id": 123
}
```

**Response:**

```json
{
  "success": true,
  "message": "Purchase approved successfully"
}
```

**Business Logic:**

1. Changes status to 'approved'
2. Increases product stock
3. Posts to AP ledger
4. Creates GL entries:
   - DR: Inventory
   - CR: AP

**Permissions Required:** `purchases.edit`

---

### PUT `/purchases` {#purchases-update}

Update an existing purchase.

**Request Body:**

```json
{
  "id": 123,
  "quantity": 150,
  "invoice_price": 7500.00,
  "notes": "Updated quantity"
}
```

**Business Logic:**

1. If already approved: Reverses GL entries
2. Recalculates stock adjustment
3. Reposts with new values

**Permissions Required:** `purchases.edit`

---

### DELETE `/purchases` {#purchases-delete}

Delete (reverse) a purchase.

**Request Body:**

```json
{
  "id": 123
}
```

**Business Logic:**

1. Marks as `is_reversed=true`
2. Reduces product stock
3. Reverses AP transaction
4. Creates reversing GL entries

**Permissions Required:** `purchases.delete`

---

### GET `/requests` {#purchase-requests-list}

Get purchase requisitions.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_name": "Product A",
      "quantity": 50,
      "notes": "Running low",
      "requester": "John Doe",
      "status": "pending",
      "created_at": "2026-01-09T08:00:00.000000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST `/requests` {#purchase-requests-create}

Create a purchase request.

**Request Body:**

```json
{
  "product_id": 1,
  "quantity": 50,
  "notes": "Stock replenishment"
}
```

---

## Inventory & Products

### GET `/products` {#products-list}

Get paginated product list.

**Query Parameters:**

| Parameter | Type | Description |
| ----------- | ------ | ------------- |
| `page` | integer | Page number |
| `per_page` | integer | Items per page |
| `category_id` | integer | Filter by category |
| `search` | string | Search by name or barcode |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Product A",
      "category_id": 1,
      "category_name": "Electronics",
      "barcode": "123456789",
      "stock_quantity": 50,
      "selling_price": 100.00,
      "purchase_price": 70.00,
      "min_stock": 10,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST `/products` {#products-create}

Create a new product.

**Request Body:**

```json
{
  "name": "New Product",
  "category_id": 1,
  "barcode": "9876543210",
  "stock_quantity": 0,
  "selling_price": 150.00,
  "purchase_price": 100.00,
  "minimum_profit_margin": 20.00,
  "min_stock": 5,
  "unit_name": "Box",
  "sub_unit_name": "Piece",
  "items_per_unit": 12,
  "description": "Product description"
}
```

---

### PUT `/products` {#products-update}

Update product information.

**Request Body:**

```json
{
  "id": 1,
  "selling_price": 120.00,
  "min_stock": 15
}
```

---

### DELETE `/products` {#products-delete}

Delete a product.

**Request Body:**

```json
{
  "id": 1
}
```

**Note:** Only allowed if product has no transaction history.

---

### GET `/categories` {#categories-list}

Get product categories.

**Response:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Electronics" },
    { "id": 2, "name": "Food" }
  ]
}
```

---

## Accounts Receivable (AR)

### GET `/ar_customers` {#ar-customers-list}

Get customer list.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Customer A",
      "phone": "0501234567",
      "address": "Riyadh, KSA",
      "tax_number": "123456789",
      "account_code": "1200-001",
      "balance": 5000.00,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST `/ar_customers` {#ar-customers-create}

Create a customer.

**Request Body:**

```json
{
  "name": "New Customer",
  "phone": "0501234567",
  "address": "Riyadh, KSA",
  "tax_number": "123456789"
}
```

**Business Logic:**

- Auto-generates unique `account_code`

---

### GET `/ar_ledger` {#ar-ledger}

Get customer ledger/transactions.

**Query Parameters:**

| Parameter | Type | Required |
| ----------- | ------ | ---------- |
| `customer_id` | integer | No (all customers if omitted) |
| `start_date` | date | No |
| `end_date` | date | No |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_id": 1,
      "customer_name": "Customer A",
      "transaction_type": "sale",
      "amount": 1000.00,
      "reference_type": "invoice",
      "reference_id": 123,
      "voucher_number": "INV-00123",
      "transaction_date": "2026-01-09T10:00:00.000000Z"
    },
    {
      "id": 2,
      "customer_id": 1,
      "customer_name": "Customer A",
      "transaction_type": "payment",
      "amount": -500.00,
      "payment_method": "cash",
      "transaction_date": "2026-01-10T11:00:00.000000Z"
    }
  ]
}
```

---

### POST `/ar_ledger` {#ar-ledger-create}

Record a customer payment or adjustment.

**Request Body:**

```json
{
  "customer_id": 1,
  "transaction_type": "payment",
  "amount": 500.00,
  "payment_method": "cash",
  "description": "Partial payment"
}
```

**Transaction Types:**

- `payment` - Customer payment (reduces balance)
- `adjustment` - Manual adjustment

---

## Accounts Payable (AP)

### GET `/ap_suppliers` {#ap-suppliers-list}

Get supplier list.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Supplier A",
      "phone": "0501234567",
      "tax_number": "987654321",
      "account_code": "2100-001",
      "is_active": true
    }
  ]
}
```

---

### POST `/ap_payment` {#ap-payment}

Record supplier payment.

**Request Body:**

```json
{
  "supplier_id": 1,
  "amount": 1000.00,
  "payment_method": "bank_transfer",
  "description": "Invoice payment"
}
```

**Business Logic:**

1. Creates AP transaction
2. Posts GL entries:
   - DR: AP
   - CR: Cash/Bank

---

### GET `/ap_ledger` {#ap-ledger}

Get supplier ledger.

**Query Parameters:**

| Parameter | Type |
| ----------- | ------ |
| `supplier_id` | integer |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "supplier_name": "Supplier A",
      "balance": 5000.00,
      "transactions": [ ... ]
    }
  ]
}
```

---

## General Ledger

### GET `/trial_balance` {#trial-balance}

Get trial balance report.

**Query Parameters:**

| Parameter | Type | Description |
| ----------- | ------ | ------------- |
| `as_of_date` | date | Balance as of date (default: current) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "account_code": "1010",
      "account_name": "Cash",
      "debit": 50000.00,
      "credit": 0.00
    },
    {
      "account_code": "4010",
      "account_name": "Sales Revenue",
      "debit": 0.00,
      "credit": 100000.00
    }
  ],
  "totals": {
    "total_debits": 250000.00,
    "total_credits": 250000.00
  }
}
```

---

### GET `/account_details` {#account-details}

Get account details and transactions.

**Query Parameters:**

| Parameter | Type | Required |
| ----------- | ------ | ---------- |
| `code` | string | Yes |

**Response:**

```json
{
  "success": true,
  "account": {
    "code": "1010",
    "name": "Cash",
    "type": "Asset",
    "balance": 50000.00
  },
  "transactions": [
    {
      "voucher_number": "JV-00001",
      "voucher_date": "2026-01-09",
      "description": "Cash sale",
      "debit": 1000.00,
      "credit": 0.00,
      "running_balance": 51000.00
    }
  ]
}
```

---

### GET `/gl_entries` {#gl-entries}

Get general ledger entries.

**Query Parameters:**

| Parameter | Type |
| ----------- | ------ |
| `start_date` | date |
| `end_date` | date |
| `account_code` | string |

---

### GET `/accounts` {#chart-of-accounts}

Get chart of accounts.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "account_code": "1000",
      "account_name": "Assets",
      "account_type": "Asset",
      "parent_id": null,
      "is_active": true,
      "children": [
        {
          "id": 2,
          "account_code": "1010",
          "account_name": "Cash",
          "parent_id": 1
        }
      ]
    }
  ]
}
```

---

### POST `/accounts` {#accounts-create}

Create a new account.

**Request Body:**

```json
{
  "account_code": "1015",
  "account_name": "Petty Cash",
  "account_type": "Asset",
  "parent_id": 1,
  "description": "Small cash transactions"
}
```

---

## Financial Reports

### GET `/reports/balance_sheet` {#balance-sheet}

Get balance sheet.

**Query Parameters:**

| Parameter | Type | Default |
| ----------- | ------ | --------- |
| `as_of_date` | date | Current date |

**Response:**

```json
{
  "success": true,
  "data": {
    "assets": {
      "current_assets": {
        "cash": 50000.00,
        "receivables": 20000.00,
        "inventory": 100000.00
      },
      "fixed_assets": 200000.00,
      "total_assets": 370000.00
    },
    "liabilities": {
      "current_liabilities": {
        "payables": 30000.00,
        "tax_payable": 5000.00
      },
      "total_liabilities": 35000.00
    },
    "equity": {
      "capital": 300000.00,
      "retained_earnings": 35000.00,
      "total_equity": 335000.00
    },
    "balance_check": true
  }
}
```

---

### GET `/reports/profit_loss` {#profit-loss}

Get profit & loss statement.

**Query Parameters:**

| Parameter | Type | Required |
| ----------- | ------ | ---------- |
| `start_date` | date | Yes |
| `end_date` | date | Yes |

**Response:**

```json
{
  "success": true,
  "data": {
    "revenues": {
      "sales": 500000.00,
      "other_revenue": 10000.00,
      "total_revenue": 510000.00
    },
    "cost_of_goods_sold": 300000.00,
    "gross_profit": 210000.00,
    "operating_expenses": {
      "salaries": 50000.00,
      "rent": 20000.00,
      "utilities": 5000.00,
      "total": 75000.00
    },
    "net_income": 135000.00
  }
}
```

---

### GET `/reports/cash_flow` {#cash-flow}

Get cash flow statement.

**Query Parameters:**

| Parameter | Type |
| ----------- | ------ |
| `start_date` | date |
| `end_date` | date |

**Response:**

```json
{
  "success": true,
  "data": {
    "operating_activities": {
      "cash_from_sales": 450000.00,
      "cash_to_suppliers": -280000.00,
      "cash_to_employees": -50000.00,
      "net_operating": 120000.00
    },
    "investing_activities": {
      "asset_purchases": -100000.00,
      "net_investing": -100000.00
    },
    "financing_activities": {
      "capital_injection": 50000.00,
      "net_financing": 50000.00
    },
    "net_increase": 70000.00,
    "beginning_cash": 30000.00,
    "ending_cash": 100000.00
  }
}
```

---

### GET `/reports/aging_receivables` {#aging-receivables}

Get AR aging report.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "customer_name": "Customer A",
      "current": 1000.00,
      "30_days": 500.00,
      "60_days": 300.00,
      "90_days": 200.00,
      "over_90": 100.00,
      "total": 2100.00
    }
  ],
  "totals": {
    "current": 5000.00,
    "30_days": 2000.00,
    "60_days": 1000.00,
    "90_days": 500.00,
    "over_90": 200.00,
    "total": 8700.00
  }
}
```

---

### GET `/reports/aging_payables` {#aging-payables}

Get AP aging report.

---

### GET `/reports/comparative` {#comparative-report}

Get comparative financial analysis.

**Query Parameters:**

| Parameter | Type |
| ----------- | ------ |
| `period1_start` | date |
| `period1_end` | date |
| `period2_start` | date |
| `period2_end` | date |

---

## HR & Payroll

### GET `/employees` {#employees-list}

Get employee list.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employee_code": "EMP-001",
      "full_name": "John Doe",
      "email": "john@example.com",
      "department_id": 1,
      "department_name": "Sales",
      "hire_date": "2025-01-01",
      "base_salary": 10000.00,
      "employment_status": "active",
      "contract_type": "full_time"
    }
  ],
  "pagination": { ... }
}
```

---

### POST `/employees` {#employees-create}

Create a new employee.

**Request Body:**

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "0501234567",
  "national_id": "1234567890",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "department_id": 1,
  "hire_date": "2026-01-01",
  "base_salary": 10000.00,
  "contract_type": "full_time",
  "iban": "SA1234567890",
  "bank_name": "Al Rajhi Bank"
}
```

**Business Logic:**

- Auto-generates `employee_code`
- Creates GL account for employee

---

### GET `/employees/{id}` {#employees-show}

Get employee details.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "employee_code": "EMP-001",
    "full_name": "John Doe",
    "allowances": [
      { "allowance_type": "Housing", "amount": 2000.00 }
    ],
    "deductions": [
      { "deduction_type": "GOSI", "amount": 900.00 }
    ],
    "documents": [
      {
        "document_type": "contract",
        "document_url": "/storage/docs/contract.pdf"
      }
    ]
  }
}
```

---

### PUT `/employees/{id}` {#employees-update}

Update employee.

---

### DELETE `/employees/{id}` {#employees-delete}

Delete (soft delete) employee.

---

### POST `/employees/{id}/suspend` {#employees-suspend}

Suspend employee.

---

### POST `/employees/{id}/activate` {#employees-activate}

Reactivate employee.

---

### POST `/employees/{id}/documents` {#employees-upload-document}

Upload employee document.

**Request:** Multipart form data

- `file` - Document file
- `document_type` - Type (contract, id, certificate, etc.)

---

### POST `/payroll/generate` {#payroll-generate}

Generate payroll cycle.

**Request Body:**

```json
{
  "cycle_name": "January 2026 Salary",
  "cycle_type": "salary",
  "period_start": "2026-01-01",
  "period_end": "2026-01-31",
  "employee_ids": [1, 2, 3]
}
```

**Response:**

```json
{
  "success": true,
  "cycle_id": 5,
  "items_created": 3,
  "total_amount": 45000.00,
  "approval_level": 2,
  "next_approver": "Manager Name"
}
```

**Business Logic:**

1. Creates `payroll_cycles` record
2. For each employee:
   - Calculates: base_salary + allowances - deductions
   - Creates `payroll_items`
3. Sets approval level based on total:
   - < 10,000: Level 1
   - < 50,000: Level 2
   - >= 50,000: Level 3

---

### GET `/payroll/cycles` {#payroll-cycles-list}

Get payroll cycles.

**Query Parameters:**

| Parameter | Type |
| ----------- | ------ |
| `status` | string |
| `cycle_type` | string |

---

### POST `/payroll/{id}/approve` {#payroll-approve}

Approve payroll cycle.

**Business Logic:**

1. Validates user is next approver
2. Sets `approved_by_level_X`
3. If all approvals complete:
   - Status → 'approved'
   - Posts accrual GL entries

---

### POST `/payroll/{id}/process-payment` {#payroll-process-payment}

Process payroll payment.

**Request Body:**

```json
{
  "payment_account_id": 10
}
```

**Business Logic:**

1. Creates `payroll_transactions`
2. Posts payment GL entries:
   - DR: Salary Payable
   - CR: Cash/Bank
3. Status → 'paid'

---

### PUT `/payroll/items/{itemId}` {#payroll-item-update}

Update individual payroll item.

**Request Body:**

```json
{
  "base_amount": 11000.00,
  "allowances": 2500.00,
  "deductions": 1000.00
}
```

---

### POST `/payroll/items/{itemId}/toggle-status` {#payroll-item-toggle}

Enable/disable payroll item in cycle.

---

## System Administration

### GET `/dashboard` {#dashboard}

Get dashboard statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "today_sales": 15000.00,
    "today_breakdown": {
      "cash": 10000.00,
      "credit": 5000.00
    },
    "total_products": 500,
    "low_stock_count": 15,
    "expiring_soon_count": 8,
    "total_sales": 1500000.00,
    "today_expenses": 5000.00,
    "total_expenses": 500000.00,
    "total_revenues": 1500000.00,
    "total_assets": 2000000.00,
    "recent_sales": [ ... ]
  }
}
```

---

### GET `/settings` {#settings-get}

Get system settings.

---

### POST `/settings` {#settings-update}

Update system settings.

**Request Body:**

```json
{
  "store_name": "My Store",
  "store_address": "Riyadh, KSA",
  "tax_number": "123456789",
  "cr_number": "987654321"
}
```

---

### GET `/users` {#users-list}

Get users list.

---

### POST `/users` {#users-create}

Create user.

---

### GET `/roles` {#roles-list}

Get roles and permissions.

---

### POST `/roles` {#roles-create}

Create role.

**Request Body:**

```json
{
  "role_key": "accountant",
  "role_name_ar": "محاسب",
  "role_name_en": "Accountant",
  "permissions": [
    {
      "module_key": "sales",
      "can_view": true,
      "can_create": true,
      "can_edit": false,
      "can_delete": false
    }
  ]
}
```

---

### GET `/sessions` {#sessions-list}

Get active sessions.

---

### DELETE `/sessions/{id}` {#sessions-delete}

Terminate a session.

---

### GET `/audit-logs` {#audit-logs}

Get audit trail.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_name": "admin",
      "action": "CREATE",
      "module": "invoices",
      "record_id": 123,
      "ip_address": "127.0.0.1",
      "created_at": "2026-01-09T10:30:00.000000Z"
    }
  ],
  "pagination": { ... }
}
```

---

## Multi-Currency

### GET `/currencies` {#currencies-list}

Get currency list.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "SAR",
      "name": "Saudi Riyal",
      "symbol": "ر.س",
      "exchange_rate": 1.00,
      "is_primary": true,
      "is_active": true
    },
    {
      "id": 2,
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "exchange_rate": 3.75,
      "is_primary": false,
      "is_active": true
    }
  ]
}
```

---

### POST `/currencies` {#currencies-create}

Create currency.

---

### PUT `/currencies/{id}` {#currencies-update}

Update currency exchange rate.

---

### POST `/currencies/{id}/toggle` {#currencies-toggle}

Activate/deactivate currency.

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": [
      "Validation error message"
    ]
  }
}
```

### Common Error Codes

| HTTP Code | Meaning | Example |
| ----------- | --------- | --------- |
| `400` | Bad Request | Missing required field |
| `401` | Unauthorized | Invalid session token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `422` | Unprocessable Entity | Validation failed |
| `500` | Internal Server Error | Server exception |

### Validation Errors Example

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "items": ["The items field is required."],
    "items.0.product_id": ["The selected product does not exist."],
    "payment_type": ["The payment type must be either cash or credit."]
  }
}
```

---

## Rate Limiting

Currently not implemented. Recommended for production:

- **Anonymous:** 60 requests/minute
- **Authenticated:** 300 requests/minute
- **Admin:** Unlimited

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**

- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)

**Response Structure:**

```json
{
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_records": 150,
    "total_pages": 8
  }
}
```

---

## Changelog

### Version 2.0 (January 2026)

- Migrated to Laravel 12
- Added multi-currency support
- Implemented HR & payroll module
- Enhanced security with session tokens
- ZATCA e-invoicing integration
