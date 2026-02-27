# Security Policy -- ACCSYSTEM ERP

## 1. Overview

The ACCSYSTEM ERP platform handles sensitive business data including financial transactions, employee records, payroll information, customer and supplier accounts, and tax compliance documents (ZATCA e-invoicing). The security of this data is a non-negotiable priority.

This document defines the project's security support policy, the process for reporting vulnerabilities, and the expected response timeline.

---

## 2. Supported Versions

Security patches are provided for the following versions. If you are running an unsupported version, you should upgrade before reporting issues, as the vulnerability may already be resolved.

| Version | Support Status | Notes |
| ------- | -------------- | ----- |
| 1.x (current) | Actively supported | Receives security patches and critical bug fixes |
| Pre-release (< 1.0) | Not supported | No security patches will be issued |

The project follows semantic versioning. Security patches will be released as patch-level increments (e.g., 1.2.3 to 1.2.4) and will not introduce breaking changes.

---

## 3. Reporting a Vulnerability

### 3.1 Disclosure Policy

This project follows a **responsible disclosure** model. If you discover a security vulnerability, you must report it privately. Under no circumstances should security vulnerabilities be disclosed through:

- Public GitHub issues
- Public GitHub discussions
- Public pull requests
- Social media or blog posts
- Any other public forum

Public disclosure of an unpatched vulnerability puts all users of the software at risk and will be treated as a violation of this policy.

### 3.2 How to Report

Send a detailed report to the project maintainer:

**Emran Nasser**
**Email: amrannaser3@gmail.com**
**Subject Line: [SECURITY] Vulnerability Report -- ACCSYSTEM ERP**

### 3.3 Information to Include

A complete vulnerability report enables faster resolution. Include as much of the following as possible:

| Field | Description |
| ----- | ----------- |
| **Summary** | A brief description of the vulnerability and its potential impact |
| **Affected Component** | The specific module, file, endpoint, or feature affected (e.g., `SalesService.php`, `POST /api/invoices`, ZATCA QR generation) |
| **Severity Assessment** | Your assessment of the severity: Critical, High, Medium, or Low |
| **Reproduction Steps** | Step-by-step instructions to reproduce the vulnerability, starting from a clean installation |
| **Proof of Concept** | Any code, scripts, payloads, or configuration that demonstrates the vulnerability |
| **Environment** | PHP version, Laravel version, MySQL version, Node.js version, operating system, and browser (if applicable) |
| **Suggested Remediation** | If you have identified a potential fix, describe it here |
| **Attachments** | Screenshots, log excerpts, HTTP request/response captures |

### 3.4 Classification Guide

The following severity levels are used to prioritise response and remediation:

| Severity | Description | Examples |
| -------- | ----------- | -------- |
| **Critical** | Allows unauthenticated remote code execution, full database access, or complete authentication bypass | SQL injection in login endpoint, direct file upload to executable directory, session token generation flaw |
| **High** | Allows authenticated privilege escalation, access to data belonging to other users/tenants, or significant data corruption | IDOR vulnerability in employee records, payroll data exposure to unauthorised roles, ledger manipulation |
| **Medium** | Allows limited information disclosure, denial of service, or bypasses a non-critical security control | User enumeration via login error messages, missing rate limiting on API endpoints, CSRF on non-critical actions |
| **Low** | Theoretical vulnerabilities, informational findings, or issues that require unusual preconditions to exploit | Missing security headers with no exploitable impact, verbose error messages in non-production environments |

---

## 4. Response Process

### 4.1 Timeline

| Stage | Target Timeframe |
| ----- | ---------------- |
| Initial acknowledgement of receipt | Within 48 hours |
| Assessment and severity confirmation | Within 5 business days |
| Interim status update (if fix is not yet ready) | Every 7 calendar days |
| Patch release for Critical/High vulnerabilities | Within 14 calendar days |
| Patch release for Medium/Low vulnerabilities | Within 30 calendar days |

These timeframes represent targets, not guarantees. Complex vulnerabilities may require additional time for a thorough fix. The reporter will be kept informed of progress throughout.

### 4.2 Process Steps

1. **Acknowledgement.** The maintainer confirms receipt of the report and assigns a tracking identifier.
2. **Triage.** The reported vulnerability is assessed for validity, severity, and affected scope.
3. **Remediation.** A patch is developed and tested in a private branch. The fix will include relevant automated tests to prevent regression.
4. **Release.** The patch is merged, a new version is released, and the changelog is updated.
5. **Disclosure.** After the patch is released, a security advisory will be published describing the vulnerability, affected versions, and the remediation. The advisory will not include exploitation details beyond what is necessary for users to understand the risk.
6. **Credit.** The reporter will be credited in the security advisory and the CHANGELOG, unless they request anonymity.

### 4.3 Coordinated Disclosure

If the vulnerability affects a third-party dependency (e.g., Laravel, Next.js, a Composer or npm package), the maintainer will coordinate disclosure with the upstream project's security team and will not publish the advisory until the upstream fix is available.

---

## 5. Security Architecture (Summary)

The following is a high-level overview of the security controls implemented in ACCSYSTEM ERP. This information is provided to assist security researchers in understanding the attack surface.

### 5.1 Authentication

- **Mechanism.** Session-token-based authentication. Tokens are generated on login and transmitted via the `X-Session-Token` HTTP header.
- **Password Storage.** Bcrypt hashing with a minimum cost factor of 12.
- **Login Throttling.** Failed login attempts are recorded in the `login_attempts` table. Excessive failures from a single IP or for a single user trigger temporary lockout.

### 5.2 Authorisation

- **Model.** Role-Based Access Control (RBAC). Users are assigned roles; roles are granted permissions on a per-module, per-action basis.
- **Enforcement.** Laravel Policies and middleware enforce authorisation checks at the controller layer. Services assume that authorisation has already been verified by the time they are called.
- **Permission Granularity.** Permissions are scoped to individual modules (e.g., `sales.create`, `payroll.approve`, `gl.post`).

### 5.3 Input Validation

- **Backend.** All incoming data is validated through Laravel Form Request classes. Validation rules are defined declaratively and enforced before the controller action executes.
- **Frontend.** Client-side validation provides user feedback but is not relied upon for security.

### 5.4 Data Access

- **ORM.** All database queries use Eloquent ORM or the Laravel query builder, both of which use parameterised queries internally. Raw SQL string concatenation is prohibited by project policy.
- **Mass Assignment Protection.** All models define `$fillable` or `$guarded` arrays.

### 5.5 Output Encoding

- **API.** All API responses are JSON. No HTML, XML, or other markup is generated server-side.
- **Frontend.** React's default behaviour escapes interpolated values, preventing reflected XSS in rendered output.

### 5.6 Financial Data Integrity

- **Double-Entry Enforcement.** The `LedgerService` validates that every journal entry balances (total debits equal total credits) before persisting.
- **Fiscal Period Locking.** Closed fiscal periods prevent new postings, protecting historical financial data from modification.
- **Audit Trail.** Critical operations are logged with timestamps, user identifiers, and before/after values.

---

## 6. Scope Exclusions

The following are out of scope for vulnerability reports:

- Vulnerabilities in third-party dependencies that have already been reported upstream and have patches available. Update your installation instead.
- Issues that require physical access to the server.
- Social engineering attacks against project contributors or users.
- Denial-of-service attacks that rely purely on volumetric traffic.
- Issues found in development, staging, or demonstration environments that do not affect the production configuration.
- Automated scanner output without a verified, reproducible proof of concept.

---

## 7. Contact

For all security-related communications:

**Emran Nasser**
**Email: amrannaser3@gmail.com**

For non-security issues, please use the standard issue reporting process described in [CONTRIBUTING.md](CONTRIBUTING.md).

---

*Last updated: February 2026*
