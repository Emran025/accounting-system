# Supermarket Management System

A complete web-based grocery store management system built with PHP, MySQL, and vanilla JavaScript.

## Features

- **Product Management**: Full CRUD operations for products with minimum profit margin tracking
- **Purchase Management**: Track purchases with automatic stock updates and 24-hour edit constraint
- **Sales/POS System**: Point of sale interface with invoice generation and automatic printing
- **Authentication**: Secure login with session management and login throttling
- **Database Auto-Initialization**: Automatically creates tables and seeds 100 products on first run

## Tech Stack

- **Frontend**: Pure HTML + CSS (Cairo font) + Vanilla JavaScript
- **Backend**: Native PHP (procedural style) + MySQL (mysqli)
- **Architecture**: Separation of concerns with `presentation/` and `domain/` directories

## Installation

1. **Prerequisites**:
   - XAMPP (or any PHP/MySQL server)
   - PHP 7.4 or higher
   - MySQL 5.7 or higher

2. **Setup**:
   - Place the project in your web server directory (e.g., `C:\xampp\htdocs\supermarket-system_1`)
   - Ensure MySQL is running
   - Update database credentials in `domain/config.php` if needed:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_USER', 'root');
     define('DB_PASS', '');
     define('DB_NAME', 'supermarket_system');
     ```

3. **Database Initialization**:
   - The database and tables will be created automatically on first access
   - 100 products will be seeded automatically
   - Default login credentials:
     - **Username**: `admin`
     - **Password**: `admin123`

4. **Access the Application**:
   - Open your browser and navigate to: `http://localhost/supermarket-system_1/presentation/login.html`
   - Or simply: `http://localhost/supermarket-system_1/` (redirects to login)

## Project Structure

```
supermarket-system_1/
├── domain/              # Backend PHP code
│   ├── config.php       # Configuration
│   ├── db.php           # Database connection & initialization
│   ├── auth.php         # Authentication & session management
│   └── api.php          # API endpoints
├── presentation/        # Frontend code
│   ├── styles.css       # Shared styles
│   ├── common.js        # Shared JavaScript utilities
│   ├── login.html       # Login page
│   ├── login.js         # Login logic
│   ├── products.html    # Product management page
│   ├── products.js      # Product management logic
│   ├── purchases.html   # Purchase management page
│   ├── purchases.js     # Purchase management logic
│   ├── sales.html       # Sales/POS page
│   └── sales.js         # Sales/POS logic
└── index.php            # Entry point (redirects to login)
```

## Usage

### Login
- Use the default credentials: `admin` / `admin123`
- After 3 failed attempts, login is throttled with increasing wait times

### Product Management
- View all products in a table
- Add new products with minimum profit margin
- Edit existing products
- Delete products
- View product details in a dialog

### Purchase Management
- View all purchases sorted by newest first
- Add new purchases (automatically updates stock)
- Edit purchases (only within 24 hours)
- Delete purchases (automatically adjusts stock)
- View purchase details

### Sales/POS
- Select products from the available products table
- Add items to invoice with quantity and unit price
- System warns if price is below minimum profit margin
- Generate invoice with invoice number
- Automatic print dialog after invoice creation
- View all invoices
- Delete invoices (only within 48 hours)
- View invoice details with all items

## Security Features

- SQL Injection protection using prepared statements
- Password hashing with PHP's `password_hash()`
- Session-based authentication
- One active session per user
- Login throttling after failed attempts
- CSRF protection through session tokens

## Business Rules

1. **Purchase Editing**: Purchases can only be edited within 24 hours of creation
2. **Invoice Editing**: Invoices cannot be edited, but can be deleted within 48 hours
3. **Stock Management**: Stock is automatically updated when purchases or sales are made
4. **Profit Margin**: System warns when selling price is below minimum profit margin

## Notes

- All code follows procedural PHP style (no classes)
- Frontend uses pure JavaScript (no frameworks)
- CSS uses Cairo font family for consistent typography
- Database tables are created automatically on first run
- 100 products are seeded automatically for testing

## Default Login

- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change the default password in production!

## Support

For issues or questions, please refer to the code comments or contact your instructor.

