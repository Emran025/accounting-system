# ACCSYSTEM ERP System - Enterprise Resource Planning

> **Enterprise-Grade ERP Solution** | Laravel 12 + Next.js 16 | Full-Stack TypeScript/PHP

[![Laravel](https://img.shields.io/badge/Laravel-12.x-red.svg)](https://laravel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org)
[![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4.svg)](https://php.net)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## About ACCSYSTEM ERP

**ACCSYSTEM ERP** is a comprehensive, enterprise-grade **Enterprise Resource Planning (ERP)** system designed for small to medium-sized businesses. Built with modern technologies, it integrates all core business functions into a unified platform.

### Why Choose ACCSYSTEM ERP?

| Feature | Benefit |
| ------- | ------- |
| **Unified Platform** | Seamlessly integrates Sales, Purchases, Inventory, Finance, HR, and Payroll |
| **Real-Time Data** | Instant updates across all modules with automatic ledger postings |
| **ZATCA Compliant** | Full Saudi Arabia e-invoicing compliance with QR code generation |
| **Multi-Language** | Arabic (RTL) and English interface support |
| **Role-Based Access** | Granular permissions with multi-level approval workflows |
| **Audit Trail** | Complete transaction history and change tracking |
| **Modern Stack** | Laravel 12 backend with Next.js 16 frontend |

---

## 🚀 Quick Start

### Prerequisites

- **PHP 8.2+** with extensions: `sqlite3`, `mbstring`, `xml`, `bcmath`, `json`, `curl`
- **Composer** (latest)
- **Node.js 20+** and npm
- **Git**

### Installation (5 minutes)

```bash
# 1. Clone the repository
git clone <your-repo-url> ACCSYSTEM-erp
cd ACCSYSTEM-erp

# 2. Backend Setup
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan db:seed

# or reset and reseed
php artisan migrate:fresh --seed

# 3. Frontend Setup
cd ../frontend
npm install

# 4. Run the application
# Terminal 1 - Backend
cd backend && php artisan serve

# Terminal 2 - Frontend
cd frontend && npm run dev

# 5. Access the ERP
# Open http://localhost:3000
# Default login: admin / admin
```

---

## 📚 Documentation

For **complete documentation**, see the `/docs` folder:

| Document | Description |
| -------- | ----------- |
| **[USER_GUIDE.md](./docs/USER_GUIDE.md)** | 📖 Bilingual user manual (Arabic/English) for non-technical users |
| **[TECHNICAL_DOCUMENTATION.md](./docs/TECHNICAL_DOCUMENTATION.md)** | 🔧 Complete technical architecture and developer guide |
| **[API_REFERENCE.md](./docs/API_REFERENCE.md)** | 🔌 REST API documentation with examples |
| **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** | 🗃️ Full database schema with ERD diagrams |
| **[DOCUMENTATION_INDEX.md](./docs/DOCUMENTATION_INDEX.md)** | 🗺️ Documentation navigation guide |

---

## 📦 ERP Modules

### Core Business Modules

| Module | Description | Key Features |
| ------ | ----------- | ------------ |
| **Sales & POS** | Point of Sale and invoicing | Cash/credit sales, ZATCA e-invoicing, barcode/QR |
| **Purchases** | Procurement management | Multi-level approval, supplier management |
| **Inventory** | Stock management | FIFO/Average costing, expiry tracking, reorder alerts |
| **AR (Receivables)** | Customer credit management | Aging reports, payment tracking, customer ledger |
| **AP (Payables)** | Supplier payment management | Payment scheduling, supplier ledger |
| **General Ledger** | Double-entry bookkeeping | Chart of accounts, journal vouchers, trial balance |
| **Financial Reports** | Comprehensive reporting | Balance Sheet, P&L, Cash Flow, Comparative Analysis |
| **HR & Payroll** | Complete HR & Workforce Management | **20+ modules:** Employees, Recruitment, Onboarding, Performance, Learning, Compensation, Benefits, EHS, Wellness, Knowledge Management, and more |
| **Fixed Assets** | Asset lifecycle | Depreciation (SL/DB), disposal tracking |
| **Multi-Currency** | International transactions | Exchange rates, multi-currency invoicing |
| **Fiscal Periods** | Period management | Opening/closing periods, period locking |
| **Accrual Accounting** | Advanced accounting | Prepayments, unearned revenue, payroll accruals |

### System Features

| Feature | Description |
| ------- | ----------- |
| **Dashboard** | Real-time KPIs, sales trends, inventory alerts |
| **Role Management** | Customizable roles with granular permissions |
| **Audit Trail** | Complete transaction logging |
| **Document Sequences** | Automatic numbering for invoices, vouchers |
| **Batch Processing** | Background job processing |
| **Government Fees** | Configurable fees (Kharaj, taxes) |

---

## 🏗️ Architecture

```txt
┌─────────────────────────────────────┐
│   NEXT.JS FRONTEND (Port 3000)      │
│   React 19 + TypeScript + Tailwind  │
└─────────────────┬───────────────────┘
                  │ REST API (JSON)
┌─────────────────▼───────────────────┐
│    LARAVEL BACKEND (Port 8000)      │
│    PHP 8.2 + MVC + Service Layer    │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│    DATABASE (SQLite/MySQL)          │
│    52 Tables, Full ACID Compliance  │
└─────────────────────────────────────┘
```

**Design Patterns:**

- **Backend:** Service Layer, Repository (Eloquent), Form Requests, Middleware
- **Frontend:** Component-based, Custom Hooks, Utility-first CSS

---

## Project Structure

```txt
ACCSYSTEM-erp/
│
├── backend/                      # Laravel Backend (API)
│   ├── app/
│   │   ├── Http/Controllers/Api/  # 35 Controllers
│   │   ├── Models/                # 50 Eloquent Models
│   │   ├── Services/              # 11 Business Services
│   │   └── Helpers/               # Utility Functions
│   ├── database/migrations/       # 52 Migration Files
│   ├── routes/api.php             # API Routes
│   └── ...
│
├── frontend/                   # Next.js Frontend
│   ├── app/                  # App Router Pages
│   │   ├── auth/             # Authentication
│   │   ├── system/           # Dashboard, Settings, Reports
│   │   ├── sales/            # Sales & Invoicing
│   │   ├── purchases/        # Purchases & Expenses
│   │   ├── finance/          # GL, Accounts, Periods
│   │   ├── hr/               # HR & Payroll
│   │   └── navigation/       # Navigation Landing Page
│   ├── components/           # Reusable Components
│   ├── lib/                  # API, Types, Utilities
│   └── ...
│
└── docs/                     # Documentation
    ├── USER_GUIDE.md
    ├── TECHNICAL_DOCUMENTATION.md
    ├── API_REFERENCE.md
    ├── DATABASE_SCHEMA.md
    └── DOCUMENTATION_INDEX.md
```

---

## Development

### Running Locally

**Full Stack (Recommended):**

```bash
# Terminal 1 - Backend
cd backend
php artisan serve

# Terminal 2 - Queue Worker (for background jobs)
cd backend
php artisan queue:listen

# Terminal 3 - Frontend
cd frontend
npm run dev
```

**With Composer Script (Backend only):**

```bash
cd backend
composer dev
# Runs: API, Queue, Logs concurrently
```

### Making Changes

**Backend (Laravel):**

```bash
# Create migration
php artisan make:migration create_table_name

# Run migrations
php artisan migrate

# Create controller
php artisan make:controller Api/MyController

# Clear cache
php artisan config:clear
```

**Frontend (Next.js):**

- Edit files in `frontend/app/`
- Auto-reloads on save
- Add types to `lib/types.ts`
- Build: `npm run build`

---

## Testing

**Backend:**

```bash
cd backend
php artisan test
```

**Frontend:**

- Testing framework: Jest + React Testing Library (configurable)

---

## Database Schema Highlights

**52 Tables Covering:**

| Category | Tables |
| ---------- | -------- |
| **Auth & Users** | users, sessions, roles, modules, role_permissions, login_attempts |
| **Inventory** | products, categories, purchases, purchase_requests, inventory_costing, inventory_counts |
| **Sales** | invoices, invoice_items, zatca_einvoices, sales_returns, sales_return_items |
| **AR/AP** | ar_customers, ar_transactions, ap_suppliers, ap_transactions |
| **Finance** | chart_of_accounts, general_ledger, fiscal_periods, journal_vouchers |
| **HR & Payroll** | employees, departments, payroll_cycles, payroll_items, payroll_transactions, employee_documents, employee_allowances, employee_deductions, expat_management, employee_assets, recruitment_requisitions, job_applicants, interviews, onboarding_workflows, contingent_workers, qa_compliance, workforce_schedules, employee_relations_cases, travel_requests, employee_loans, corporate_announcements, pulse_surveys, performance_goals, performance_appraisals, learning_courses, succession_plans, compensation_plans, benefits_plans, ehs_incidents, wellness_programs, knowledge_base, expertise_directory, and 20+ more tables |
| **Advanced** | assets, asset_depreciation, prepayments, unearned_revenue, reconciliations, currencies, currency_denominations |
| **System** | settings, document_sequences, batch_processing, batch_items, recurring_transactions, telescope, government_fees, invoice_fees |

---

## Security

- **Authentication:** Session-based with secure tokens
- **Authorization:** Role-based permissions (RBAC)
- **Validation:** Laravel Form Requests
- **SQL Injection:** Protected via Eloquent ORM
- **XSS:** React auto-escaping + custom utilities
- **Password Hashing:** Bcrypt (12 rounds)

---

## Deployment

### Production Checklist

**Backend:**

```bash
# Set environment
APP_ENV=production
APP_DEBUG=false

# Use production database (MySQL/PostgreSQL)
DB_CONNECTION=mysql

# Optimize
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# for clear database and magigration it again and seed
php artisan migrate:refresh --seed

# Set up queue worker with Supervisor
```

**Frontend:**

```bash
# Build
npm run build

# Run production server
npm start

# Or deploy to Vercel/Netlify
```

See [TECHNICAL_DOCUMENTATION.md](./docs/TECHNICAL_DOCUMENTATION.md#11-deployment-guide) for detailed deployment instructions.

---

## API Documentation

**Base URL:** `http://localhost:8000/api`

**Authentication:**

- Header: `X-Session-Token: {your_token}`
- Obtain via: `POST /api/login`

**Key Endpoints:**

| Endpoint | Method | Description |
| ---------- | -------- | ------------- |
| `/login` | POST | User authentication |
| `/invoices` | GET, POST | Invoice management |
| `/purchases` | GET, POST | Purchase management |
| `/products` | GET, POST | Product management |
| `/trial_balance` | GET | Trial balance report |
| `/reports/balance_sheet` | GET | Balance sheet |
| `/reports/profit_loss` | GET | P&L statement |
| `/payroll/generate` | POST | Generate payroll cycle |
| `/employees` | GET, POST | Employee management |

See [API_REFERENCE.md](./docs/API_REFERENCE.md) for complete API documentation.

---

## Tech Stack

### Backend (`/backend`)

| Component | Technology |
| --------- | ---------- |
| **Framework** | Laravel 12 |
| **Language** | PHP 8.2+ |
| **Database** | SQLite (dev), MySQL/PostgreSQL (prod) |
| **ORM** | Eloquent |
| **Queue** | Database driver |
| **Cache** | Database driver |

### Frontend (`/frontend`)

| Component | Technology |
| --------- | ---------- |
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **HTTP Client** | Fetch API |

---

## Troubleshooting

**Common Issues:**

| Problem | Solution |
| --------- | ---------- |
| "No encryption key" | `php artisan key:generate` |
| Database error | Check `.env` DB settings, ensure DB exists |
| 500 API error | Check `storage/logs/laravel.log` |
| Frontend can't connect | Verify backend running on port 8000 |
| 401 Unauthorized | Clear localStorage, re-login |
| Changes not reflecting | Clear cache: `php artisan config:clear` |

See [TECHNICAL_DOCUMENTATION.md](./docs/TECHNICAL_DOCUMENTATION.md#10-troubleshooting--common-issues) for detailed troubleshooting.

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

---

## Support

- **Documentation:** See `/docs` folder
- **Issues:** Submit via GitHub Issues with detailed logs
- **Logs:** Check `backend/storage/logs/laravel.log`

---

> Built with ❤️ using Laravel & Next.js  
> **Developed by: Emran Nasser && AI Agents**
