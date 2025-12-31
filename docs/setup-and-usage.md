# Setup and Usage Guide

## Environment Requirements
To run this project, you need the following installed:
- **Server**: Apache (or Nginx) with PHP 8.0 or higher.
- **Database**: MariaDB 10.4 or MySQL 5.7 or higher.
- **Tooling**: XAMPP, WAMP, or any local PHP/DB stack.
- **Web Browser**: Modern browser (Chrome, Firefox, Safari, Edge).

## Local Setup Instructions

1. **Clone/Download**: Extract the project files into your server root (e.g., `C:/xampp/htdocs/supermarket-system/`).
2. **Database Configuration**:
   - Open `domain/config.php`.
   - Update `DB_HOST`, `DB_USER`, `DB_PASS`, and `DB_NAME` to match your local database settings.
   - The system is designed to **auto-create** the database and tables if they don't exist upon the first run.
3. **Application Initialization**:
   - Navigate to `http://localhost/supermarket-system/` (or your specific directory).
   - On the first load, the `init_database()` function will create all required tables.
4. **Login**:
   - **Default Username**: `admin`
   - **Default Password**: `admin123`
   - *Recommendation*: Change these credentials immediately after the first login.

## Basic Usage

### Managing Products
1. Go to the **Products** section.
2. Click **Add Product** to populate your catalog.
3. Use the **Edit** button to update existing items.

### Recording Purchases (Inbound)
1. Navigate to **Purchases**.
2. Select a product, input the quantity received and the total invoice cost.
3. Select the unit type (Carton/Piece).
4. Save to automatically update the stock and selling price.

### Processing Sales
1. Open the **Sales** page.
2. Select items for the customer.
3. Adjust quantities as needed.
4. Review the total and click **Complete Sale** to generate an invoice.

## Troubleshooting
- **Database Error**: Ensure your MySQL service is running in XAMPP.
- **Permission Denied**: Check if the `domain/` folder has appropriate write permissions for log files.
- **Page Not Found**: Ensure the URL matches the folder structure in `htdocs`.

## Future Improvements
- **Reports Dashboard**: Graphical visualization of sales trends and profit analysis.
- **Supplier Management**: A dedicated table to track multiple suppliers.
- **Barcode Integration**: Support for barcode scanners in the sales interface.
- **Multi-User Roles**: Standardizing "Manager" vs "Cashier" permissions.
- **Discount System**: Ability to apply coupons or seasonal discounts on invoices.
