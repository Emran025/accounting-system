# System Architecture

## Overall System Architecture
The Supermarket Management System is built on a **3-Tier Architecture**, ensuring clear separation of concerns, scalability, and maintainability.

### 1. Presentation Tier (Frontend)
- Built with standard Web technologies (HTML/JS/CSS).
- Communicates with the backend exclusively via asynchronous JSON requests (Fetch API).
- Handles UI state management and user feedback.

### 2. Logic Tier (Backend API)
- Developed in PHP.
- Stateless design: It doesn't store user data in local variables; instead, it relies on the database and session tokens for state.
- Enforces business rules (e.g., "Cannot sell more than available stock").

### 3. Data Tier (Relational Database)
- MariaDB/MySQL storage.
- Stores persistent data for configurations, transactions, and users.
- Ensures data integrity through Foreign Key constraints and ACID transactions.

## Communication Flow
1. **Request**: The user interacts with the UI (e.g., clicks "Save Product").
2. **Transmission**: The Frontend sends a POST request with JSON payload to `domain/api.php?action=products`.
3. **Processing**: The Backend validates the user's session, sanitizes the input, and executes the SQL query.
4. **Response**: The Backend returns a success or error message in JSON format.
5. **Update**: The UI dynamically updates the table or displays an alert based on the response.

## Design Decisions and Reasoning
- **Procedural PHP with Functions**: Chosen for high performance and low overhead on shared hosting environments (XAMPP).
- **Client-Side Rendering**: By using JS to build tables, we reduce server load and provide a modern, snappy feel.
- **Cascading Deletes**: Used in the DB schema to ensure that if a product or category is deleted, related historical items don't orphan (referential integrity).
- **Dynamic Price Calculation**: Decided to calculate price on new purchases automatically to prevent manual entry errors and ensure consistent profit margins.

## Scalability Considerations
- **Database Indexing**: Critical columns like `invoice_number` and `product_id` are indexed to ensure fast lookups even as the database grows to thousands of records.
- **Stateless API**: Because the API is stateless, it can theoretically be deployed across multiple servers (behind a load balancer) without complex session synchronization (provided they share the same DB).
- **Separation of Files**: UI and Backend logic are in separate directories (`presentation` vs `domain`), allowing frontend developers to work on styling without touching the server logic.
