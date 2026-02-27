## Description

<!-- Provide a clear and concise description of what this pull request accomplishes.
     Explain WHAT changed and WHY the change was necessary. Do not describe HOW the
     code works line by line; the diff serves that purpose. Focus on intent, trade-offs,
     and any design decisions that a reviewer would need to understand. -->



## Related Issues

<!-- Link every issue that this pull request addresses. Use GitHub closing keywords
     so that issues are automatically closed upon merge.

     Examples:
       Closes #42
       Fixes #108, #109
       Resolves #215

     If no issue exists, explain why this change was initiated without one. -->



## Type of Change

<!-- Place an 'x' in every box that applies. -->

- [ ] **feat** -- New feature or enhancement (adds functionality)
- [ ] **fix** -- Bug fix (corrects existing behaviour)
- [ ] **refactor** -- Code restructuring (no behaviour change)
- [ ] **perf** -- Performance improvement
- [ ] **docs** -- Documentation only
- [ ] **style** -- Code formatting (no logic change)
- [ ] **test** -- Test additions or corrections
- [ ] **build** -- Build system or dependency changes
- [ ] **ci** -- CI/CD pipeline changes
- [ ] **chore** -- Other (tooling, configuration, maintenance)
- [ ] **breaking** -- This change introduces a breaking change (describe in "Breaking Changes" section below)

## Affected Modules

<!-- Place an 'x' next to every ERP module or system area affected by this change.
     This helps reviewers focus their attention. -->

- [ ] Authentication / Sessions
- [ ] User and Role Management
- [ ] Sales / POS / Invoicing
- [ ] Purchases / Procurement
- [ ] Inventory / Products
- [ ] Accounts Receivable (AR)
- [ ] Accounts Payable (AP)
- [ ] General Ledger / Journal Vouchers
- [ ] Fiscal Periods
- [ ] Payroll / Salary Calculation
- [ ] HR / Employee Management
- [ ] Recruitment / Onboarding
- [ ] Performance Management
- [ ] Learning and Development
- [ ] Benefits / Compensation
- [ ] Attendance / Scheduling
- [ ] Leave Management
- [ ] EHS / Wellness
- [ ] Fixed Assets / Depreciation
- [ ] Multi-Currency
- [ ] ZATCA E-Invoicing
- [ ] Financial Reports
- [ ] Document Templates
- [ ] Organisational Structure
- [ ] Dashboard / KPIs
- [ ] System Settings
- [ ] Database Migrations
- [ ] API Routes / Middleware
- [ ] Frontend Components
- [ ] Frontend State (Zustand)
- [ ] CI/CD Pipelines
- [ ] Documentation

---

## Changes Made

<!-- Provide a detailed, structured list of everything that was changed.
     Group by layer (backend, frontend, database) if helpful.
     Be specific: name the files, classes, methods, or components affected. -->

### Backend

-

### Frontend

-

### Database / Migrations

-

### Other

-

---

## Testing

### Automated Tests

<!-- Describe the tests you have written or updated to cover this change.
     Reference specific test files and test method names. -->

- [ ] New unit tests added (list files):
- [ ] New feature/integration tests added (list files):
- [ ] Existing tests updated (list files):
- [ ] All tests pass locally: `php artisan test` (backend) and `npm run test` (frontend)

### Manual Testing Steps

<!-- Provide precise, step-by-step instructions that a reviewer can follow to verify
     the change manually. Include the starting state, actions, and expected outcomes.
     Use numbered steps for clarity. -->

1.
2.
3.

**Expected Result:**

---

## Self-Review Checklist

<!-- Place an 'x' in every box. All items must be checked before requesting review. -->

### Code Quality

- [ ] I have performed a thorough self-review of my own code.
- [ ] My code follows this project's coding standards (PSR-12 for PHP, TypeScript strict mode for frontend).
- [ ] I have run `./vendor/bin/pint` to format backend code.
- [ ] I have run `npm run format` and `npm run lint` to format and lint frontend code.
- [ ] I have added comments only where the code is non-obvious. Self-documenting code is preferred.
- [ ] I have not introduced any TODO, FIXME, or HACK comments without an associated issue number.

### Architecture

- [ ] My change respects the project's layer separation (Controllers are thin; business logic is in Services; Models define data shape only).
- [ ] My change does not introduce cross-module dependencies that bypass service interfaces.
- [ ] New API endpoints are protected by authentication middleware.
- [ ] New endpoints or actions are covered by RBAC policies.

### Database

- [ ] Any new migration implements both `up()` and `down()` methods correctly.
- [ ] Foreign key column names follow the `<table_singular>_id` convention.
- [ ] Foreign key constraint names do not exceed MySQL's 64-character limit.
- [ ] I have tested `php artisan migrate:fresh --seed` from a clean database.

### Testing

- [ ] All new and existing backend tests pass with `php artisan test`.
- [ ] All new and existing frontend tests pass with `npm run test`.
- [ ] I have tested in both LTR (English) and RTL (Arabic) modes if the change involves UI.

### Documentation

- [ ] I have updated `docs/API_REFERENCE.md` if the change adds or modifies API endpoints.
- [ ] I have updated `docs/DATABASE_SCHEMA.md` if the change adds or modifies tables.
- [ ] I have updated `docs/USER_GUIDE.md` if the change affects user-facing behaviour.
- [ ] I have updated inline documentation (PHPDoc / JSDoc) for new or modified methods and components.

### Security

- [ ] I have not committed any credentials, API keys, or secrets.
- [ ] All user input is validated through Form Request classes (backend) before processing.
- [ ] I have verified that no raw SQL string concatenation is present.

---

## Breaking Changes

<!-- If this pull request introduces any breaking changes, describe them here.
     Include: what changed, why it changed, and what consumers must do to migrate.
     If there are no breaking changes, write "None." -->

None.

---

## Screenshots or Visual Demonstrations

<!-- If this change modifies the user interface, include before/after screenshots or
     a brief description of the visual change. For API-only changes, this section
     may be omitted. -->



---

## Performance Impact

<!-- If this change has measurable performance implications (positive or negative),
     describe them here. Include benchmark data if available (query counts, response
     times, memory usage). For changes with no performance impact, write "None expected." -->

None expected.

---

## Deployment Notes

<!-- Describe any special steps required to deploy this change that go beyond the
     standard deployment procedure. Examples:
     - New environment variables that must be configured
     - One-time Artisan commands to run
     - Cache invalidation requirements
     - Third-party service configuration changes
     If none, write "Standard deployment procedure applies." -->

Standard deployment procedure applies.

---

## Additional Context

<!-- Any other information that would help the reviewer understand this change.
     This may include links to external documentation, design documents, related
     pull requests in other repositories, or technical constraints that influenced
     the implementation. -->

