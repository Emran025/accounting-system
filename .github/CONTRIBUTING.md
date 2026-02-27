# Contributing to ACCSYSTEM ERP

This document describes the conventions, standards, and processes that govern contributions to the ACCSYSTEM ERP platform. All contributors, whether internal team members or external collaborators, are expected to read this guide in its entirety before submitting any code, documentation, or configuration change.

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Table of Contents

1. [Project Overview for Contributors](#1-project-overview-for-contributors)
2. [Prerequisites and Local Environment Setup](#2-prerequisites-and-local-environment-setup)
3. [Repository Layout and Module Boundaries](#3-repository-layout-and-module-boundaries)
4. [Branching Strategy](#4-branching-strategy)
5. [Commit Message Convention](#5-commit-message-convention)
6. [Pull Request Process](#6-pull-request-process)
7. [Backend Development Standards (Laravel 12)](#7-backend-development-standards-laravel-12)
8. [Frontend Development Standards (Next.js 16)](#8-frontend-development-standards-nextjs-16)
9. [Database and Migration Discipline](#9-database-and-migration-discipline)
10. [Testing Requirements](#10-testing-requirements)
11. [Documentation Expectations](#11-documentation-expectations)
12. [Security Considerations](#12-security-considerations)
13. [Performance Guidelines](#13-performance-guidelines)
14. [Internationalization and Right-to-Left Support](#14-internationalization-and-right-to-left-support)
15. [Issue Reporting](#15-issue-reporting)
16. [Getting Help](#16-getting-help)

---

## 1. Project Overview for Contributors

ACCSYSTEM ERP is a full-stack Enterprise Resource Planning system built for small-to-medium businesses. It comprises:

- **Backend** -- A Laravel 12 (PHP 8.2+) REST API that exposes business logic through a service-oriented architecture. The backend manages authentication, role-based access control, double-entry accounting, payroll processing, inventory costing, ZATCA electronic invoicing, and over one hundred database tables.
- **Frontend** -- A Next.js 16 (React 19, TypeScript 5) single-page application that communicates with the backend exclusively through REST endpoints. The UI uses Tailwind CSS 4, Zustand for state management, and renders a desktop-class ERP interface with multi-language (Arabic RTL / English LTR) support.
- **Desktop Wrapper** -- An optional Tauri-based desktop build that packages the frontend as a native application.

The two application layers live in the `backend/` and `frontend/` directories respectively. They are independently deployable and share no server-side rendering pipeline.

---

## 2. Prerequisites and Local Environment Setup

### Required Software

| Software | Minimum Version | Purpose |
| -------- | --------------- | ------- |
| PHP | 8.2 | Laravel runtime |
| Composer | latest | PHP dependency management |
| Node.js | 20 | Frontend build toolchain |
| npm | 10 | JavaScript package management |
| MySQL | 8.0 | Primary relational database |
| Git | 2.40+ | Version control |

PHP must be compiled with or have the following extensions enabled: `pdo_mysql`, `mbstring`, `xml`, `bcmath`, `json`, `curl`, `zip`, `intl`, `fileinfo`.

### Step-by-Step Local Setup

1. **Fork and clone the repository.**

   ```bash
   git clone https://github.com/<YOUR_USERNAME>/ACCSYSTEM.git
   cd ACCSYSTEM
   ```

2. **Provision the database.**

   Create a MySQL database (for example, `accsystem`) and a test database (`accsystem_test`). Record the credentials.

3. **Configure and start the backend.**

   ```bash
   cd backend
   composer install
   cp .env.example .env
   ```

   Open `.env` and set `DB_CONNECTION=mysql`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` to match your local MySQL instance.

   ```bash
   php artisan key:generate
   php artisan migrate --seed
   ```

4. **Install and start the frontend.**

   ```bash
   cd ../frontend
   npm install
   ```

5. **Run both layers concurrently.**

   Open two terminals:

   ```bash
   # Terminal 1 -- Backend on port 8000
   cd backend && php artisan serve

   # Terminal 2 -- Frontend on port 3000
   cd frontend && npm run dev
   ```

   Alternatively, the backend provides a Composer script that runs the API, queue worker, log tailer, and Vite dev server simultaneously:

   ```bash
   cd backend && composer dev
   ```

6. **Verify the installation.**

   Navigate to `http://localhost:3000`. Log in with the default credentials (`admin` / `admin`). Confirm that the dashboard loads and that API requests to `http://localhost:8000/api` return valid JSON.

---

## 3. Repository Layout and Module Boundaries

```
ACCSYSTEM/
  backend/
    app/
      Enums/              Typed enumerations (status values, transaction types)
      Exceptions/         Custom exception classes
      Helpers/            Global helper functions (currency, dates, numbers-to-words)
      Http/
        Controllers/      68 API controllers organised by domain
        Middleware/        Session authentication, CORS
        Requests/         Form Request validation classes
        Resources/        API Resource transformers
      Models/             117 Eloquent models
      Policies/           Authorization policy classes
      Providers/          Service providers
      Services/           27 domain services (core business logic)
    database/
      factories/          26 model factories
      migrations/         122 migration files (MySQL)
      seeders/            16 database seeders
    routes/
      api.php             Route registration entry point
      api/                Modular route files per domain
    tests/                PHPUnit / Pest test suite
  frontend/
    app/                  Next.js App Router pages and layouts
    components/
      layout/             Application shell components
      navigation/         Sidebar, top bar, search bar, status bar
      template-editor/    Document template editing system
      ui/                 Reusable UI primitives
    lib/                  API client, type definitions, utilities
    stores/               Zustand state management stores
    tests/                Vitest test suite
    types/                Shared TypeScript type declarations
  docs/                   Extended documentation (user guide, API ref, schema, etc.)
  .github/                CI/CD workflows, issue templates, contribution policies
```

### Module Ownership

Each ERP functional module (Sales, Purchases, HR, Finance, Inventory, etc.) has its own:

- Controller(s) in `backend/app/Http/Controllers/`
- Service(s) in `backend/app/Services/`
- Model(s) in `backend/app/Models/`
- Migration(s) in `backend/database/migrations/`
- Frontend pages in `frontend/app/<module>/`

Contributors must respect these boundaries. A change to the payroll calculation engine, for example, must not introduce side effects into the sales invoicing pipeline. Cross-module interactions should be mediated through well-defined service interfaces.

---

## 4. Branching Strategy

The repository follows a trunk-based workflow with short-lived feature branches.

### Protected Branches

| Branch | Purpose | Merge Policy |
| ------ | ------- | ------------ |
| `main` | Production-ready code | Pull Request required; CI must pass |
| `develop` | Integration branch for next release | Pull Request required; CI must pass |

### Branch Naming Convention

All branch names must use a descriptive prefix followed by a forward slash and a kebab-case identifier. The prefix must be one of the following:

| Prefix | Use Case | Example |
| ------ | -------- | ------- |
| `feat/` | New functionality | `feat/payroll-overtime-calculation` |
| `fix/` | Bug correction | `fix/ledger-rounding-error` |
| `refactor/` | Internal restructuring | `refactor/purchase-service-decomposition` |
| `docs/` | Documentation only | `docs/api-reference-update` |
| `chore/` | Build, CI, dependencies | `chore/upgrade-laravel-12.4` |
| `test/` | Test additions or corrections | `test/ar-aging-report-edge-cases` |
| `perf/` | Performance improvement | `perf/dashboard-query-optimisation` |

### Workflow

1. Ensure your local `main` (or `develop`) is current: `git pull upstream main`.
2. Create a branch: `git checkout -b feat/your-feature`.
3. Make small, focused commits (see section 5).
4. Push to your fork: `git push origin feat/your-feature`.
5. Open a Pull Request against `develop` (or `main` for hotfixes).

---

## 5. Commit Message Convention

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification, version 1.0.0.

### Format

```
<type>(<optional scope>): <imperative description>

[optional body]

[optional footer(s)]
```

### Type Reference

| Type | Meaning |
| ---- | ------- |
| `feat` | A new feature visible to end users or API consumers |
| `fix` | A correction to existing behaviour |
| `docs` | Changes limited to documentation files |
| `style` | Formatting, whitespace, semicolons; no logic change |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature |
| `perf` | A change that improves performance |
| `test` | Adding or correcting automated tests |
| `build` | Changes to the build system or external dependencies |
| `ci` | Changes to CI/CD configuration files and scripts |
| `chore` | Routine tasks that do not fit other categories |
| `revert` | Reverts a previous commit |

### Scope

Use a scope to identify the affected module or layer. Scopes are lowercase and must correspond to a recognised area:

`auth`, `sales`, `purchases`, `inventory`, `ar`, `ap`, `gl`, `payroll`, `hr`, `assets`, `currency`, `fiscal`, `dashboard`, `templates`, `zatca`, `org`, `frontend`, `backend`, `ci`, `docs`, `db`

### Rules

- The description must be in the imperative mood ("Add", "Fix", "Remove" -- not "Added" or "Adds").
- The description must not exceed 72 characters.
- Do not end the description with a period.
- Capitalise the first letter of the description.
- If the commit introduces a breaking change, the footer must include `BREAKING CHANGE: <explanation>`.
- Reference related issues in the footer: `Closes #42`, `Fixes #108`.

### Examples

```
feat(payroll): Add overtime multiplier to salary calculation engine

Introduce a configurable overtime_rate field on PayrollComponent.
The SalaryCalculatorService now applies this rate when computing
gross pay for hourly employees.

Closes #312
```

```
fix(gl): Correct double-posting on voided journal vouchers

Previously, voiding a journal voucher created new ledger entries
without reversing the originals. This patch ensures that the
LedgerService reverses all original entries atomically.

Fixes #287
```

```
refactor(sales): Extract tax computation into dedicated method

No functional change. Moves inline tax logic from SalesService into
a private calculateLineTax method for readability and reuse.
```

For the full commit guidelines document, see [COMMIT_GUIDELINES.md](COMMIT_GUIDELINES.md).

---

## 6. Pull Request Process

### Before Opening a Pull Request

1. Rebase your branch onto the latest `develop` (or `main`) to resolve conflicts locally.
2. Run the full backend test suite: `cd backend && php artisan test`.
3. Run the frontend test suite: `cd frontend && npm run test`.
4. Run code formatting tools:
   - Backend: `cd backend && ./vendor/bin/pint`
   - Frontend: `cd frontend && npm run format && npm run lint`
5. Confirm that all CI checks succeed locally.

### Pull Request Content

- Fill out the Pull Request template completely. Every field is mandatory.
- Provide a clear statement of purpose explaining **what** the change does and **why** it is necessary.
- Reference related issue numbers.
- Describe how a reviewer can test the change locally, including specific commands, endpoints, or UI paths.
- If the change modifies the API surface, include example request/response payloads.
- If the change modifies the UI, include screenshots or a brief textual description of the visual change.

### Review and Merge

- At least one approving review is required before merging.
- The reviewer will assess correctness, adherence to architectural patterns, test coverage, and documentation completeness.
- Squash-merge is the preferred merge strategy to maintain a linear history.
- Delete the source branch after merging.

---

## 7. Backend Development Standards (Laravel 12)

### Architectural Layers

| Layer | Location | Responsibility |
| ----- | -------- | -------------- |
| Controller | `Http/Controllers/` | Accept HTTP input, delegate to a service, return a response |
| Form Request | `Http/Requests/` | Validate and authorise incoming data |
| Service | `Services/` | Implement business rules; interact with models and other services |
| Model | `Models/` | Define database relationships, accessors, mutators, scopes |
| Resource | `Http/Resources/` | Transform model data into API response payloads |
| Policy | `Policies/` | Authorise user actions against specific resources |
| Middleware | `Http/Middleware/` | Cross-cutting concerns (authentication, CORS) |

### Controller Guidelines

- Controllers must remain thin. A controller method should contain at most: input extraction, a single service call, and response formatting.
- Use Form Request classes for all validation. Inline validation in controller methods is not permitted.
- Return API Resources rather than raw model instances to decouple the API contract from the database schema.
- Use consistent HTTP status codes: `200` for success, `201` for resource creation, `204` for deletion, `422` for validation failure, `403` for authorisation failure, `404` for missing resources, `500` for unhandled exceptions.

### Service Guidelines

- Services encapsulate all business logic. They must not reference `Request` objects directly; accept primitive or DTO arguments instead.
- Services should be stateless. Avoid storing request-scoped data in class properties.
- Wrap multi-step write operations in database transactions (`DB::transaction()`).
- When a service must interact with another domain, inject the other service through the constructor rather than calling it statically.

### Model Guidelines

- Define all relationships explicitly (`hasMany`, `belongsTo`, `morphTo`, etc.).
- Use `$fillable` or `$guarded` to protect against mass assignment.
- Prefer Eloquent scopes for reusable query conditions.
- Do not place business logic in models. Models define data shape and relationships only.

### Coding Standards

- Follow [PSR-12](https://www.php-fig.org/psr/psr-12/) for code style.
- Run `./vendor/bin/pint` before every commit. The CI pipeline will reject non-conforming code.
- Use strict typing (`declare(strict_types=1)`) in all new PHP files.
- Prefer typed properties and return types on all methods.

---

## 8. Frontend Development Standards (Next.js 16)

### Technology Constraints

| Area | Tool | Notes |
| ---- | ---- | ----- |
| Framework | Next.js 16 (App Router) | All routing uses the `app/` directory |
| Language | TypeScript 5 | Strict mode enabled; `any` is prohibited |
| State | Zustand | Stores live in `frontend/stores/` |
| Styling | Tailwind CSS 4 | Utility-first; custom tokens defined in `globals.css` |
| HTTP | Fetch API | Centralised in `lib/` |
| Testing | Vitest | Unit and component tests |
| Linting | ESLint 9 + eslint-config-next | `npm run lint` |
| Formatting | Prettier 3 | `npm run format` |

### Component Architecture

- **Pages** live in `app/<module>/` and are responsible for data fetching and layout composition.
- **Components** live in `components/` and are grouped by purpose (`ui/`, `navigation/`, `layout/`, `template-editor/`).
- Components must be functional. Class components are not used.
- Props must be defined with explicit TypeScript interfaces. Inline `any` or `unknown` casts are not permitted.
- Keep components focused. If a component exceeds approximately 200 lines, consider decomposing it.

### State Management

- Use Zustand stores for global or cross-page state.
- Component-local state should use React's `useState` and `useReducer` hooks.
- Never store derived data in state; compute it in render or in a `useMemo`.

### API Communication

- All API calls must go through the centralised client in `lib/`.
- Handle loading, error, and empty states explicitly in every page that fetches data.
- Use the `X-Session-Token` header for authentication. The token is obtained via `POST /api/login`.

### Styling Rules

- Use Tailwind utility classes as the primary styling mechanism.
- Global design tokens (colours, spacing, typography, animation variables) are defined in `frontend/app/globals.css`.
- Avoid inline `style` attributes except for truly dynamic values (e.g., calculated widths).
- Ensure all interfaces support both LTR (English) and RTL (Arabic) layouts.

---

## 9. Database and Migration Discipline

### General Rules

- The production database engine is **MySQL 8.0**. All migrations must use MySQL-compatible column types and syntax.
- Migration file names must follow Laravel's timestamp convention: `yyyy_mm_dd_HHmmss_description.php`.
- Each migration must implement both `up()` and `down()` methods. The `down()` method must cleanly reverse the `up()` operation.
- Never modify a migration that has already been merged to `develop` or `main`. Instead, create a new migration to alter the table.

### Foreign Key Conventions

- All foreign key columns must be named `<referenced_table_singular>_id` (e.g., `employee_id`, `invoice_id`).
- MySQL enforces a 64-character limit on index and constraint names. When Laravel's auto-generated name would exceed this limit, provide an explicit short name in the `foreign()` call.
- Define foreign key constraints with appropriate `onDelete` behaviour (`cascade`, `set null`, or `restrict`) based on the domain relationship.
- Ensure referenced tables are created before the referencing table in migration ordering. If circular dependencies arise, create the tables first without foreign keys, then add the keys in a subsequent migration.

### Seeder Guidelines

- Seeders must be idempotent. Running `php artisan db:seed` multiple times must not create duplicate records.
- Use `updateOrCreate` or `firstOrCreate` rather than plain `create`.
- Core reference data (roles, default settings, chart of accounts templates) must be seeded. Transactional sample data should be clearly separated and only run in non-production environments.

---

## 10. Testing Requirements

### Backend Testing

- The test framework is **PHPUnit** with the **Pest** syntax layer.
- Tests are located in `backend/tests/` and are divided into `Unit/` and `Feature/` directories.
- Use the custom `TestCase` base class, which provides authenticated request helpers (`authGet`, `authPost`, `authPut`, `authDelete`).
- Every new service method must have at least one unit test covering the expected behaviour and one test covering an error or edge-case path.
- Every new API endpoint must have at least one feature test that verifies the HTTP status code, response structure, and database state changes.
- Run the full suite with: `cd backend && php artisan test`.
- Aim for meaningful coverage rather than arbitrary percentage targets. Critical paths (financial calculations, ledger postings, payroll computations) require exhaustive testing.

### Frontend Testing

- The test framework is **Vitest**.
- Tests are located in `frontend/tests/`.
- Test UI components for correct rendering, user interaction handling, and prop validation.
- Run the suite with: `cd frontend && npm run test`.

### Continuous Integration

- Both the backend test suite and the frontend lint/test suite run automatically on every push and pull request via GitHub Actions (see `.github/workflows/tests.yml` and `.github/workflows/lint.yml`).
- A pull request will not be merged if any CI job fails.

---

## 11. Documentation Expectations

- If your change introduces a new API endpoint, update `docs/API_REFERENCE.md` with the endpoint URI, HTTP method, request parameters, request body schema, response schema, and at least one example.
- If your change adds or modifies a database table, update `docs/DATABASE_SCHEMA.md` with the table definition and relationships.
- If your change affects user-facing behaviour, update `docs/USER_GUIDE.md` in both English and Arabic sections where applicable.
- Internal service methods should include PHPDoc blocks describing parameters, return types, and thrown exceptions.
- Frontend components should include a brief JSDoc comment explaining the component's purpose and its props interface.

---

## 12. Security Considerations

- Never commit credentials, API keys, or secrets. All sensitive values must reside in `.env` files, which are excluded from version control.
- Use Laravel Form Requests for all input validation. Do not trust client-side validation alone.
- Use parameterised queries (Eloquent or the query builder) exclusively. Raw SQL string concatenation is strictly forbidden.
- Authentication is session-token based. Ensure that all new endpoints are protected by the authentication middleware unless they are explicitly public.
- When adding new functionality that handles user data, confirm that role-based access control policies are in place.
- Report any discovered vulnerabilities privately via the process described in [SECURITY.md](SECURITY.md). Do not open public issues for security matters.

---

## 13. Performance Guidelines

- Avoid N+1 query problems. Use eager loading (`with()`, `load()`) when fetching related data.
- For endpoints that return lists, implement pagination. The standard page size is 15 records unless the domain requires otherwise.
- Heavy or long-running operations (report generation, batch imports, payroll processing) must be dispatched to the queue rather than executed synchronously in the request cycle.
- On the frontend, use `React.memo`, `useMemo`, and `useCallback` judiciously to prevent unnecessary re-renders in data-heavy table views.
- Measure before optimising. Include before/after query counts or timing in your pull request description when submitting performance changes.

---

## 14. Internationalization and Right-to-Left Support

- The application supports Arabic (RTL) and English (LTR) interfaces.
- All user-visible strings must be externalisable. Do not hard-code display text in components.
- When adding UI elements, test their appearance in both LTR and RTL modes. Tailwind's `rtl:` variant and logical properties (`start`, `end` instead of `left`, `right`) should be used for directional styling.
- Date and number formatting must respect locale settings.

---

## 15. Issue Reporting

### Bug Reports

Use the [Bug Report](https://github.com/Emran025/ACCSYSTEM/issues/new?template=1-bug-report.yml) template. Include:

- A precise description of the incorrect behaviour and the expected behaviour.
- Exact steps to reproduce the bug, starting from a clean state.
- PHP version, Laravel version, Node.js version, and browser (if applicable).
- Relevant log output from `backend/storage/logs/laravel.log` or the browser console.

### Feature Requests

Use the [Feature Request](https://github.com/Emran025/ACCSYSTEM/issues/new?template=2-feature-request.yml) template. Describe the problem the feature solves, the proposed solution, and any alternatives considered.

### Questions and Discussions

For questions that are not bug reports or feature requests, use [GitHub Discussions](https://github.com/Emran025/ACCSYSTEM/discussions).

---

## 16. Getting Help

- **Documentation:** Start with the `docs/` directory, which contains the User Guide, Technical Documentation, API Reference, and Database Schema.
- **Issue Tracker:** Search existing issues before opening a new one.
- **Discussions:** Use GitHub Discussions for general questions and architectural proposals.
- **Direct Contact:** For matters that cannot be discussed publicly (security issues, private enquiries), email `amrannaser3@gmail.com`.

---

*This document is maintained alongside the codebase and is subject to the same review process as application code. If you find an error or omission, submit a pull request with the correction.*
