# Git Workflow and Commit Message Guidelines -- ACCSYSTEM ERP

This document is the authoritative reference for the project's Git workflow, branching strategy, and commit message conventions. All contributors must follow these rules without exception. A clean, meaningful Git history is essential for debugging, code review, changelog generation, and long-term project maintainability.

---

## Table of Contents

1. [Branching Strategy](#1-branching-strategy)
2. [Commit Message Specification](#2-commit-message-specification)
3. [Type Reference](#3-type-reference)
4. [Scope Reference](#4-scope-reference)
5. [Writing the Description](#5-writing-the-description)
6. [Writing the Body](#6-writing-the-body)
7. [Writing the Footer](#7-writing-the-footer)
8. [Complete Examples](#8-complete-examples)
9. [Multi-Module Commits](#9-multi-module-commits)
10. [Migration-Specific Commits](#10-migration-specific-commits)
11. [Common Mistakes to Avoid](#11-common-mistakes-to-avoid)
12. [Pre-Commit Checklist](#12-pre-commit-checklist)

---

## 1. Branching Strategy

### Protected Branches

| Branch | Purpose | Direct Commits |
| ------ | ------- | -------------- |
| `main` | Production-ready, tagged releases | Prohibited |
| `develop` | Integration branch for the next release | Prohibited |

All work must be performed on dedicated branches created from `develop` (for regular work) or from `main` (for critical hotfixes only).

### Creating a Branch

Always synchronise with the upstream before branching:

```bash
git checkout develop
git pull upstream develop
git checkout -b <prefix>/<descriptive-name>
```

### Branch Name Format

```
<prefix>/<kebab-case-description>
```

| Prefix | Purpose | Example |
| ------ | ------- | ------- |
| `feat/` | New feature or enhancement | `feat/payroll-overtime-rules` |
| `fix/` | Bug fix | `fix/gl-unbalanced-reversal` |
| `refactor/` | Code restructuring (no behaviour change) | `refactor/sales-service-extraction` |
| `docs/` | Documentation changes only | `docs/api-reference-purchases` |
| `chore/` | Build scripts, dependencies, tooling | `chore/upgrade-phpunit-11` |
| `test/` | Adding or updating tests only | `test/inventory-costing-fifo` |
| `perf/` | Performance optimisation | `perf/dashboard-eager-loading` |
| `ci/` | CI/CD pipeline changes | `ci/add-frontend-lint-step` |

### Branch Lifecycle

1. Branch from `develop`.
2. Make focused commits (see sections below).
3. Rebase onto the latest `develop` before opening a pull request: `git rebase develop`.
4. Open the pull request. Resolve all review comments.
5. After merge, delete the branch both locally and on the remote.

---

## 2. Commit Message Specification

This project adopts the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification with project-specific extensions.

### Structure

```
<type>(<scope>): <description>
                                        <-- blank line
<body>                                  <-- optional
                                        <-- blank line
<footer(s)>                             <-- optional
```

A commit message consists of three parts: the **header** (required), the **body** (optional), and one or more **footers** (optional). Each part is separated by a blank line.

---

## 3. Type Reference

The type is a single word that categorises the nature of the change. It must be one of the following:

| Type | When to Use | Appears in Changelog |
| ---- | ----------- | -------------------- |
| `feat` | Introducing a new feature that is visible to end users or external API consumers. This includes new endpoints, new UI pages, new business logic that produces observable output. | Yes |
| `fix` | Correcting a defect in existing functionality. The previous behaviour was incorrect or unintended. | Yes |
| `docs` | Changes confined to documentation files (Markdown, JSDoc, PHPDoc). No application code is modified. | No |
| `style` | Changes that do not affect the meaning or execution of the code: whitespace, formatting, missing semicolons, Pint/Prettier output. | No |
| `refactor` | Restructuring existing code without changing its external behaviour. This includes renaming, extracting methods, simplifying logic, and reorganising files. | No |
| `perf` | A code change whose primary purpose is to improve performance (query optimisation, caching, reducing re-renders). | Yes |
| `test` | Adding new tests or correcting existing tests. No production code is changed. | No |
| `build` | Changes to the build system, build scripts, or external dependencies (Composer, npm, Vite config). | No |
| `ci` | Changes to CI/CD pipeline configuration (GitHub Actions workflows, deployment scripts). | No |
| `chore` | Routine changes that do not fit any other category (updating `.gitignore`, renaming environment file keys, updating licence year). | No |
| `revert` | Reverting a previous commit. The body must include the hash of the reverted commit. | Yes |

---

## 4. Scope Reference

The scope is an optional, lowercase identifier in parentheses that specifies which part of the codebase is affected. Use a scope when it adds clarity. Omit it only when the change is genuinely cross-cutting (e.g., upgrading a global dependency).

### Recognised Scopes

**Domain Modules:**

| Scope | Module |
| ----- | ------ |
| `auth` | Authentication, sessions, login |
| `users` | User management, profiles |
| `roles` | Role and permission management |
| `sales` | Invoicing, POS, sales returns |
| `purchases` | Purchase orders, purchase requests, receiving |
| `inventory` | Products, stock, inventory costing, counts |
| `ar` | Accounts Receivable (customers, transactions, aging) |
| `ap` | Accounts Payable (suppliers, transactions) |
| `gl` | General Ledger, journal vouchers, trial balance |
| `fiscal` | Fiscal periods, period locking |
| `payroll` | Payroll cycles, salary calculation, payroll items |
| `hr` | Employee management, contracts, documents |
| `recruitment` | Requisitions, applicants, interviews, onboarding |
| `performance` | Goals, appraisals, continuous feedback |
| `learning` | Courses, enrolments, certifications |
| `benefits` | Benefit plans, enrolments |
| `compensation` | Compensation plans, entries |
| `attendance` | Attendance records, biometric integration, schedules |
| `leave` | Leave requests, balances, policies |
| `ehs` | Environment, health, safety incidents, PPE |
| `wellness` | Wellness programmes, participation |
| `expat` | Expatriate management, documents |
| `assets` | Fixed assets, depreciation |
| `currency` | Multi-currency, exchange rates, revaluation |
| `zatca` | ZATCA e-invoicing, UBL generation, QR codes |
| `reports` | Financial reports (P&L, balance sheet, cash flow) |
| `templates` | Document templates, template editor |
| `org` | Organisational structure (nodes, links, topology) |
| `dashboard` | KPIs, dashboard metrics |
| `settings` | System settings, sequences |
| `telescope` | Monitoring, debugging logs |

**Infrastructure Scopes:**

| Scope | Area |
| ----- | ---- |
| `db` | Database schema, migrations, seeders |
| `api` | API routes, middleware, CORS |
| `frontend` | Frontend-only changes (components, stores, styles) |
| `backend` | Backend-only changes without a specific module scope |
| `deps` | Dependency updates |
| `ci` | Continuous integration pipelines |
| `docker` | Containerisation configuration |

---

## 5. Writing the Description

The description is the single most important element. It must:

- Use the **imperative mood**: "Add", "Fix", "Remove", "Refactor", "Update". Not "Added", "Adds", "Adding".
- Begin with a **capital letter**.
- **Not** end with a period.
- Be **72 characters or fewer** in total (including the type and scope).
- Describe **what** the commit does, not how it does it.

Acceptable:
```
feat(payroll): Add overtime rate configuration to payroll components
```

Not Acceptable:
```
feat(payroll): added a new field for overtime in the payroll_components table, updated the service, and also fixed a bug in the calculator
```

---

## 6. Writing the Body

The body is optional but strongly recommended for any commit that:

- Introduces a new feature or changes existing behaviour.
- Addresses a non-obvious bug.
- Makes an architectural or design decision.
- Affects more than a handful of lines.

The body must:

- Be separated from the header by one blank line.
- Explain **what** was changed and **why**, not the mechanical steps of how.
- Use bullet points for lists of related changes.
- Wrap lines at 80 characters.

```
feat(gl): Introduce automatic reversal for accrual journal entries

Accrual entries (identified by the `is_accrual` flag) now generate a
reversal entry on the first day of the following fiscal period. The
reversal is created by the LedgerService during period-close processing.

- The reversal entry references the original entry via `reversal_of_id`
- Both entries share the same batch identifier for traceability
- Reversals inherit the original entry's cost centre allocation
```

---

## 7. Writing the Footer

Footers are used for two purposes:

### Issue References

Reference related issues using GitHub's closing keywords:

```
Closes #142
Fixes #97
Resolves #203
```

Multiple issues may be referenced:

```
Closes #142, #143
```

### Breaking Changes

If the commit introduces a change that breaks backward compatibility (API contract, database schema, configuration format, or CLI interface), the footer must include:

```
BREAKING CHANGE: <description of what changed and how to migrate>
```

Example:

```
refactor(api): Rename /api/ledger endpoint to /api/general-ledger

The endpoint previously accessible at /api/ledger has been renamed to
/api/general-ledger to align with the module naming convention used
throughout the rest of the API.

BREAKING CHANGE: All API consumers must update their base URL from
/api/ledger to /api/general-ledger. The old endpoint will return a
301 redirect for 30 days, after which it will be removed entirely.
```

---

## 8. Complete Examples

### Simple Feature

```
feat(inventory): Add expiry date tracking to product model
```

### Bug Fix with Scope and Body

```
fix(sales): Prevent negative line totals on credit note items

The SalesService allowed negative quantities on credit note line items
without adjusting the sign of the line total. This resulted in double-
negative amounts being posted to the general ledger.

The calculateLineTotal method now uses the absolute value of the
quantity and applies the credit sign at the invoice level.

Fixes #312
```

### Documentation Update

```
docs(api): Document pagination parameters for list endpoints

Add query parameter documentation for `page`, `per_page`, and `sort_by`
to all list endpoints in API_REFERENCE.md. Include response envelope
format showing `data`, `meta`, and `links` keys.
```

### Refactoring with No Behaviour Change

```
refactor(purchases): Extract supplier validation into dedicated method

No functional change. Moves inline supplier existence and status checks
from PurchaseService::createOrder into a private validateSupplier method.
This reduces method length and enables reuse in the upcoming purchase
return workflow.
```

### Performance Improvement

```
perf(dashboard): Replace N+1 queries with eager loading on KPI endpoint

The /api/dashboard/kpis endpoint previously issued one query per module
to count active records. This has been replaced with a single query
using subselects, reducing the total query count from 12 to 1.

Response time improved from ~820ms to ~45ms on a dataset of 50,000
invoices.
```

### Migration Commit

```
feat(db): Add overtime_rate column to payroll_components table

New nullable decimal(8,4) column for configuring overtime multipliers.
Defaults to NULL, which signals that the component does not participate
in overtime calculations.
```

### Breaking Change

```
refactor(auth): Replace session-token header with Bearer token format

BREAKING CHANGE: The `X-Session-Token` header is no longer accepted.
All API consumers must send the token in the `Authorization` header
using the Bearer scheme: `Authorization: Bearer <token>`. The login
endpoint response format is unchanged.
```

### Revert

```
revert: Revert "feat(payroll): Add overtime rate configuration"

This reverts commit 4a8b3c2d. The overtime calculation logic needs
additional review for edge cases involving part-time employees with
variable schedules.
```

---

## 9. Multi-Module Commits

Avoid commits that span multiple unrelated modules. If a single logical change requires modifications to both the backend and frontend (for example, adding a new API endpoint and the corresponding UI page), this is acceptable as a single commit with a scope reflecting the primary domain:

```
feat(attendance): Add biometric sync status page with backend endpoint
```

If the changes are genuinely independent (fixing a sales bug and updating a payroll test), create separate commits.

---

## 10. Migration-Specific Commits

Database migrations deserve special attention because they are irreversible in production.

- Group related schema changes into a single migration file and a single commit.
- If a migration renames or removes a column, the commit body must explain the migration path.
- Always verify that the `down()` method cleanly reverses the `up()` method.
- Test the migration on a fresh database (`php artisan migrate:fresh --seed`) before committing.

```
feat(db): Restructure employee contracts table for multi-contract support

Split the monolithic contract fields on the employees table into a
dedicated employee_contracts table. Existing data will be migrated by
the seeder. The employees table retains a current_contract_id FK for
backward compatibility.

- Add employee_contracts table with start_date, end_date, type, salary
- Add current_contract_id FK to employees table
- Migrate existing contract data in the seeder
```

---

## 11. Common Mistakes to Avoid

| Mistake | Why It Is a Problem | Correct Approach |
| ------- | ------------------- | ---------------- |
| `update stuff` | Conveys no information about the change | Use a specific type and description |
| `fix: fix bug` | Redundant and unspecific | Describe the bug: `fix(gl): Correct rounding in trial balance totals` |
| `feat: Add user avatars, fix login bug, update README` | Multiple unrelated changes in one commit | Separate into three commits |
| `Fixed the thing John mentioned` | References a person rather than an issue | Reference the issue: `Fixes #42` |
| Using past tense: "Added feature" | Violates imperative mood convention | Use present tense: "Add feature" |
| Description over 72 characters | Truncated in `git log --oneline`, email notifications, and review tools | Shorten the description; put details in the body |
| Committing generated files | Increases repository size, causes merge conflicts | Ensure generated files are in `.gitignore` |
| Committing `.env` or secrets | Security risk | Never commit secrets; use `.env.example` as the template |

---

## 12. Pre-Commit Checklist

Before every commit, verify:

- [ ] The commit contains exactly one logical change.
- [ ] The commit message follows the format specified in this document.
- [ ] The description is in the imperative mood, capitalised, with no trailing period.
- [ ] The scope (if used) matches a recognised scope from section 4.
- [ ] Backend code has been formatted with `./vendor/bin/pint`.
- [ ] Frontend code has been formatted with `npm run format` and linted with `npm run lint`.
- [ ] All existing tests pass: `php artisan test` (backend) and `npm run test` (frontend).
- [ ] Any new functionality is accompanied by corresponding tests.
- [ ] No credentials, secrets, or environment-specific values are included in the commit.
- [ ] If the change introduces a breaking change, the footer includes `BREAKING CHANGE:`.
- [ ] If the change resolves an issue, the footer references it with `Closes`, `Fixes`, or `Resolves`.

---

*This document is part of the project's development standards and is maintained alongside the codebase. Propose changes via pull request.*
