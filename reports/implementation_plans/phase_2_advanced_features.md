# Phase 2: Advanced Features, Asset Management, and Role Integration

**Objective:** Implement document management, sophisticated asset logic, file handling, biometric integration, and a major refactor of User/Role management within the HR context.

**Estimated Timeline:** 1 Day

## 1. Document & Report Generation Component
**Action:** Create a dedicated component for managing physical/printable documents.

*   **Scope:**
    *   **Template Engine:** Implement editable templates for standard documents (Contracts, Clearance Forms, Warning Letters, etc.).
    *   **Editing:** Define clearly where users can edit the content before printing.
    *   **Specific Outputs:**
        *   **ID Cards:** functionality to generate/print employee ID cards.
        *   **Clearance/Handover Forms:** Specific templates for asset and responsibility handover.
    *   **Printing:** Ensure high-fidelity printing capabilities directly from the browser.

## 2. Employee Asset Management Refactor
**Action:** Transition from "Text Entry" assets to "System Linked" assets.

*   **Workflow Change:**
    *   **No Free Text:** Users cannot manually type an asset name/model during assignment.
    *   **Linkage:** Assets must be selected from the existing System Inventory/Fixed Assets registry.
    *   **Pre-requisites:** The asset must exist in the system and have its location defined prior to assignment.
*   **Assignment Logic:**
    *   **Availability Check:** The system must enforce that the selected asset is not currently assigned to another active employee.
    *   **Status:** It must be "New", "In Stock", or recently "Returned" (from a terminated/resigned/promoted employee).
*   **Handover/Return Process:**
    *   **Termination flow:** When an employee leaves (Resignation/Termination), trigger a "Handover" workflow.
    *   **Reporting:** Generate a report of current holdings.
    *   **Condition Check:** Mandatory step to re-evaluate asset condition (Good/Damaged) before it returns to the "Unassigned" pool.

## 3. Data Deduplication & Source of Truth
**Action:** Remove redundant data storage.

*   **Target:** Fields like `Email`, `Name`, `Phone` which might be stored in both `users` table and `employees` table.
*   **Refactor:**
    *   Ensure components reference the single source of truth (likely the `Employee` record or linked `User` record).
    *   Refactor backend migrations if necessary to normalize data.

## 4. File Management (CVs & Documents)
**Action:** Build a robust file upload and organization system.

*   **Requirements:**
    *   Frontend component for uploading formatted files (PDF, Docx).
    *   Backend storage structure to organize files (CVs, Certificates, Supporting Docs) securely.
    *   UI to list, preview, and download these files within the Employee Profile.

## 5. Biometric Device Control
**Action:** Implement a control interface for Attendance devices.

*   **Shift from Manual to Automated:**
    *   Build a UI to manage the import/sync of data from fingerprint/biometric devices.
    *   Stop relying on manual data entry for "Time In/Time Out" records where possible.
    *   **Dashboard:** View device status or last sync time.

## 6. Roles, Users, and Permissions Integration (Vital)
**Action:** Relocate and Refactor Role Management into HR.

*   **Move Component:**
    *   **Source:** `C:\xampp\htdocs\accsystem\public\app\system\settings\components\RolesTab.tsx`
    *   **Destination:** New location within the HR Module (e.g., `public/app/hr/administration/RolesAndPermissions.tsx`).
*   **Job Titles & Capacity Planning:**
    *   Merge **Job Title** creation with **Headcount/Capacity Planning**.
    *   **Logic:** Define a Job Title (e.g., "Cashier") -> Link to Department -> Define Capacity (e.g., 2 max positions).
*   **User Linking:**
    *   Create a component to link an `Employee` to a `User` account.
*   **Permission Policy Configuration:**
    *   **Decision Matrix (Policy):**
        *   **Option A (Role-Based):** Permissions are assigned strictly to the **Job Title**.
        *   **Option B (Department-Based):** Permissions are based on Dept + Job Title.
        *   **Option C (Individual-Based):** Permissions are granular per individual.
            *   *Sub-option:* Is this hierarchical (inherits from above)?
            *   *Sub-option:* Is it strictly defined by admin?
    *   **Templates (Seeder):**
        *   Create permission templates (e.g., "Trusted Employee", "Probationary Staff", "Manager").
        *   Assign these templates to Job Titles or Individuals in the Seeder.
    *   **Flexibility:**
        *   If "Individual" policy is active, allow overriding the template for specific users (Add/Remove specific permissions).
        *   If "Role" policy is active, changes update all users with that role.

## 7. Deliverables
*   Document/ID Card printing system.
*   Refactored Asset Management linked to Inventory.
*   Normalized data structure (Sales/HR/Users).
*   File Upload system for Employee docs.
*   Biometric Sync UI.
*   `RolesTab` moved and refactored into HR.
*   New Capacity Planning & Permission Policy logic implemented.
