# Phase 3: System Configuration & Logic Initialization (The "Hidden" Unit)

**Objective:** Create a centralized, restricted-access "Configuration Unit" to handle system initialization, validation logic, and policy automation. This unit acts as the "Brain" of the ERP, defining how other modules behave.

**Estimated Timeline:** 1 Day

## 1. The "Hidden" Configuration Unit
**Action:** specific module meant for system setup, not daily operations.

*   **Access:** High-level admin/System Implementer only. Future state: "System Initialization" wizard.
*   **Scope:** Global settings that dictate input validation and module behavior logic.

## 2. Logic Validation & Automation Check
**Action:** Audit all system inputs and move "automatable" decisions to this config unit.

*   **Employee ID Logic:**
    *   Define format rules (e.g., starts with Dept Code? Branch Code? Sequential?).
*   **Organizational Structure:**
    *   Tree-view configuration for Departments and Hierarchy.
    *   Define "Job Positions" and "Capacity" here (e.g., Branch X needs 2 Cashiers: 1 at POS1, 1 at POS2).
    *   **Vacancy Automation:** based on this capacity, the system tracks "Vacant" vs "Filled" positions automatically.

## 3. Localization & Leave Policy (Seeder)
**Action:** Pre-load region-specific data and define leave logic.

*   **Country Selection:**
    *   Selecting a country (e.g., Saudi Arabia, Egypt) should auto-load:
        *   National Holidays (Hijri/Gregorian).
        *   Weekend definitions.
        *   Statutory leave types.
*   **Leave Logic Configuration:**
    *   **Policy Definition:** Does a "1 Week Leave" consume 5 days or 7 days? (Is the weekend counted?).
    *   **Logic Engine:** Automate this calculation based on the selected policy.

## 4. Payroll & Financial Configuration
**Action:** Define the financial backbone of HR.

*   **Payroll Settings:**
    *   **Pay Period:** Monthly, Weekly, Bi-weekly?
    *   **Payment Method:** Bank Transfer, Cash, Cheque.
    *   **Calculation Order:** Does Payroll calc happen *after* Attendance finalization?
*   **Allowances & Benefits:**
    *   Define Global Allowances (Housing, Transport).
    *   Define Insurance Providers and Policies (Medical, Social Security).
    *   Define Expenses (Flight tickets, Fuel).
*   **Dependencies:**
    *   Configure if Leave balances affect Payroll logic directly (Unpaid leave deduction).

## 5. Persistence & Versioning
**Action:** Ensure configuration data is distinct from transactional data.

*   **Storage:** Dedicated configuration tables.
*   **Versioning (Effective Dating):**
    *   CRITICAL: If a policy changes (e.g., Overtime Rate), old records must remain calculated at the *old* rate.
    *   Support "Effective From" dates for all major policies.
*   **Export/Import:**
    *   Ability to Export the entire configuration state (JSON/XML).
    *   Ability to Import configuration to a new instance (Rapid Deployment).
*   **Recommended Defaults:**
    *   The system should highlight "Recommended" settings for users who are unsure.

## 6. Report & Template Configuration
**Action:** Centralize report settings.

*   **Customize:**
    *   Select which columns appear in standard reports.
    *   choose which templates are active.
    *   Define Export formats (PDF, Excel, CSV) availability per report.

## 7. Deliverables
*   A functional "Configuration/Initialization" dashboard.
*   Database tables for storing system policies and versioned settings.
*   Seeder files with regional data (Middle East/Arab countries focus).
*   Logic engines (Payroll, Leave, ID Generation) that read from this configuration.
*   Import/Export capability for System Config.
