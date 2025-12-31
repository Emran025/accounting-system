# Frontend Documentation

## Overview
The frontend of the Supermarket Management System is a Single Page Application (SPA) architecture delivered via multiple HTML entry points. It prioritizes a clean, "Premium Indigo" aesthetic with a focus on responsiveness and interactive feedback.

## UI Pages and Components

### 1. Login Page (`login.html`)
- **Purpose**: Secure entry point for the system.
- **Interactions**:
    - Username and password input.
    - Error feedback for failed attempts or locked accounts.
- **UX**: Uses micro-animations for input focus and loading states.

### 2. Dashboard / Sidebar
- **Purpose**: Navigation and system-wide visibility.
- **Components**:
    - Persistent sidebar for quick access to Products, Sales, and Purchases.
    - Logo and branding area.
    - User session controls (Logout).

### 3. Products Management (`products.html`)
- **Purpose**: CRUD operations for the product catalog.
- **Features**:
    - Searchable product table.
    - Add/Edit product modals.
    - Category filtering.
- **UX**: Real-time validation of prices and numeric fields.

### 4. Sales Interface (`sales.html`)
- **Purpose**: POS (Point of Sale) functionality.
- **Interactions**:
    - Dynamic product selection.
    - Live invoice item list (add/remove).
    - Subtotal and Total calculations.
    - Previous Invoices History view.
- **UX**: Dialog confirmations for price overrides and deletions.

### 5. Purchases Management (`purchases.html`)
- **Purpose**: Recording inbound inventory.
- **Features**:
    - Purchase entry form with unit selection (Main/Sub).
    - Automatic price suggestion based on previous data.
    - Purchase history list.

## Technologies Used
- **HTML5 & Vanilla JavaScript**: Core logic and structures.
- **Vanilla CSS**: Custom styling using a robust variable-based design system.
- **Google Fonts (Inter/Outfit)**: Premium typography.
- **FontAwesome / Lucide Icons**: Visual clarity.
- **AJAX (Fetch API)**: Asynchronous communication with the backend.

## Validation and UX Considerations
- **Input Masking**: Ensures numeric inputs for prices and quantities.
- **Dynamic Updates**: Stock levels and totals update in the UI without page refreshes.
- **Error Handling**: Graceful display of API errors (e.g., "Insufficient stock") via toast notifications or custom dialogs.
- **Responsive Layout**: Designed to work on tablets and desktops for both back-office and checkout use.
