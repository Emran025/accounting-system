# Documentation Index - ACCSYSTEM ERP System

> **Complete Documentation Suite for Enterprise Resource Planning System**

Welcome to the comprehensive documentation for the ACCSYSTEM ERP System. This index provides quick access to all documentation resources for our enterprise-grade ERP solution.

---

## 📚 Documentation Structure

### Core Documentation

1. **[README.md](./../README.md)**
   - Quick start guide
   - ERP overview
   - Installation instructions
   - Module summary

2. **[USER_GUIDE.md](./USER_GUIDE.md)** ⭐ **للمستخدمين | For End Users**
   - دليل مبسط بالعربية والإنجليزية
   - شرح جميع وحدات النظام
   - الدورات المستندية
   - الأدوار والصلاحيات
   - لا يحتاج خبرة تقنية

3. **[TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)** - **For Developers**
   - Complete system architecture
   - Backend & frontend detailed documentation
   - Business logic & services
   - Developer onboarding
   - Deployment guide
   - **~200 pages of comprehensive documentation**

4. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**
   - Entity Relationship Diagrams (ERD)
   - All 52 tables documented
   - Relationships and constraints
   - Normalization strategy
   - Data integrity rules

5. **[API_REFERENCE.md](./API_REFERENCE.md)**
   - Complete REST API documentation
   - All endpoints with examples
   - Request/response formats
   - Authentication guide
   - Error handling

---

## 🚀 Quick Navigation

### For New Developers

Start here to get up and running:

1. Read [README.md](./../README.md) - 5 minutes
2. Follow installation steps
3. Review [TECHNICAL_DOCUMENTATION.md - Section 9](./TECHNICAL_DOCUMENTATION.md#9-developer-onboarding)
4. Explore [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) to understand data model

### For Backend Developers

Deep dive into the Laravel backend:

1. [TECHNICAL_DOCUMENTATION.md - Section 3](./TECHNICAL_DOCUMENTATION.md#3-backend-documentation-backend)
2. [TECHNICAL_DOCUMENTATION.md - Section 7](./TECHNICAL_DOCUMENTATION.md#7-business-logic--services)
3. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
4. [API_REFERENCE.md](./API_REFERENCE.md)

### For Frontend Developers

Master the Next.js frontend:

1. [TECHNICAL_DOCUMENTATION.md - Section 4](./TECHNICAL_DOCUMENTATION.md#4-frontend-documentation-frontend)
2. [API_REFERENCE.md](./API_REFERENCE.md) for API integration
3. TypeScript interfaces in `frontend/lib/types.ts`

### For System Architects

Understand the big picture:

1. [TECHNICAL_DOCUMENTATION.md - Section 1](./TECHNICAL_DOCUMENTATION.md#1-system-overview)
2. [TECHNICAL_DOCUMENTATION.md - Section 2](./TECHNICAL_DOCUMENTATION.md#2-architecture--technology-stack)
3. [DATABASE_SCHEMA.md - Overview](./DATABASE_SCHEMA.md#overview)

### For DevOps / Deployment

Deploy to production:

1. [TECHNICAL_DOCUMENTATION.md - Section 11](./TECHNICAL_DOCUMENTATION.md#11-deployment-guide)
2. [README.md - Deployment](./../README.md#-deployment)

### For API Consumers

Integrate with the ERP system:

1. [API_REFERENCE.md](./API_REFERENCE.md) - Complete API docs
2. [TECHNICAL_DOCUMENTATION.md - Section 6](./TECHNICAL_DOCUMENTATION.md#6-api-surface--contracts)

---

## 📦 ERP Module Documentation

### Business Modules

| Module | User Guide | Technical Docs | API Reference |
| ------ | ---------- | -------------- | ------------- |
| **Sales & POS** | [User Guide](./USER_GUIDE.md#1--وحدة-المبيعات-والفواتير--sales--invoicing-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#sales--invoicing) | [API](./API_REFERENCE.md#sales--invoicing) |
| **Purchases** | [User Guide](./USER_GUIDE.md#2--وحدة-المشتريات-والمصروفات--purchases--expenses-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#purchases) | [API](./API_REFERENCE.md#purchases--expenses) |
| **Inventory** | [User Guide](./USER_GUIDE.md#3--وحدة-المخزون-والمنتجات--inventory--products-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#inventory) | [API](./API_REFERENCE.md#inventory--products) |
| **AR (Customers)** | [User Guide](./USER_GUIDE.md#4--وحدة-العملاء-والذمم-المدينة--customers--ar-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#accounts-receivable) | [API](./API_REFERENCE.md#accounts-receivable-ar) |
| **AP (Suppliers)** | [User Guide](./USER_GUIDE.md#5--وحدة-الموردين-والذمم-الدائنة--suppliers--ap-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#accounts-payable) | [API](./API_REFERENCE.md#accounts-payable-ap) |
| **General Ledger** | [User Guide](./USER_GUIDE.md#6--وحدة-الدفتر-العام--general-ledger-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#general-ledger) | [API](./API_REFERENCE.md#general-ledger) |
| **Financial Reports** | [User Guide](./USER_GUIDE.md#7--وحدة-التقارير-المالية--financial-reports-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#reports) | [API](./API_REFERENCE.md#financial-reports) |
| **HR & Payroll** | [User Guide](./USER_GUIDE.md#8--وحدة-الموارد-البشرية-والرواتب--hr--payroll-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#hr--payroll) | [API](./API_REFERENCE.md#hr--payroll) |
| **Fixed Assets** | [User Guide](./USER_GUIDE.md#9-️-وحدة-الأصول-الثابتة--fixed-assets-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#fixed-assets) | [API](./API_REFERENCE.md#fixed-assets) |
| **Multi-Currency** | [User Guide](./USER_GUIDE.md#10--وحدة-العملات-المتعددة--multi-currency-module) | [Tech Docs](./TECHNICAL_DOCUMENTATION.md#multi-currency) | [API](./API_REFERENCE.md#multi-currency) |

---

## 📖 Documentation Content Map

### TECHNICAL_DOCUMENTATION.md Sections

| Section | Content | Best For |
| ------- | ------- | -------- |
| 1. System Overview | Architecture, ERP modules | Everyone |
| 2. Architecture & Tech Stack | Technologies, design patterns | Architects, Developers |
| 3. Backend Documentation | Laravel setup, controllers, services | Backend Devs |
| 4. Frontend Documentation | Next.js setup, routing, components | Frontend Devs |
| 5. Database Schema & Models | Table structures, relationships | Backend Devs, DBAs |
| 6. API Surface & Contracts | Endpoint examples, contracts | Integration Devs |
| 7. Business Logic & Services | Core services, ERP workflows | Backend Devs |
| 8. Security & Authentication | Auth flow, permissions, security | Security, Backend Devs |
| 9. Developer Onboarding | Setup, workflow, guidelines | New Developers |
| 10. Troubleshooting | Common issues, solutions | All Developers |
| 11. Deployment Guide | Production setup, server config | DevOps |

### DATABASE_SCHEMA.md Sections

| Section | Content |
| ------- | ------- |
| Overview | Table groups, categories |
| Detailed ERD | Visual relationships (text format) |
| Key Relationships | Foreign keys, cascades |
| Indexes & Constraints | Performance, data integrity |
| Normalization | Design principles |

### API_REFERENCE.md Sections

| Section | Endpoints |
| ------- | --------- |
| Authentication | Login, logout, session check |
| Sales & Invoicing | Invoice CRUD, ZATCA |
| Purchases | Purchase CRUD, approvals |
| Inventory & Products | Product management, categories |
| AR/AP | Customer/supplier management, ledgers |
| General Ledger | Trial balance, chart of accounts |
| Financial Reports | Balance sheet, P&L, cash flow |
| HR & Payroll | Employee management, payroll processing |
| System Administration | Settings, users, roles, audit |
| Multi-Currency | Currency management |

---

## 🔍 Search Guide

### By Topic

**Authentication & Security:**

- [TECHNICAL_DOCUMENTATION.md - Section 8](./TECHNICAL_DOCUMENTATION.md#8-security--authentication)
- [API_REFERENCE.md - Authentication](./API_REFERENCE.md#authentication)

**Database Design:**

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [TECHNICAL_DOCUMENTATION.md - Section 5](./TECHNICAL_DOCUMENTATION.md#5-database-schema--models)

**API Endpoints:**

- [API_REFERENCE.md](./API_REFERENCE.md)
- [TECHNICAL_DOCUMENTATION.md - Section 6](./TECHNICAL_DOCUMENTATION.md#6-api-surface--contracts)

**Business Logic & ERP Workflows:**

- [TECHNICAL_DOCUMENTATION.md - Section 7](./TECHNICAL_DOCUMENTATION.md#7-business-logic--services)
- Backend service files in `backend/app/Services/`

**Deployment:**

- [TECHNICAL_DOCUMENTATION.md - Section 11](./TECHNICAL_DOCUMENTATION.md#11-deployment-guide)

**Troubleshooting:**

- [TECHNICAL_DOCUMENTATION.md - Section 10](./TECHNICAL_DOCUMENTATION.md#10-troubleshooting--common-issues)

---

## 📊 Statistics

### Documentation Coverage

- **Total Pages:** ~250+ (combined)
- **Tables Documented:** 52/52 (100%)
- **API Endpoints Documented:** 110+ endpoints
- **Controllers Documented:** 35/35
- **Services Documented:** 11/11
- **Code Examples:** 100+ snippets

### Codebase Metrics

**Backend:**

- Laravel 12
- PHP 8.2+
- 52 migrations
- 50 models
- 35 controllers
- 11 services
- 3 helpers

**Frontend:**

- Next.js 16
- React 19
- TypeScript 5
- 30+ pages
- 34 UI components
- 4 navigation components
- 7 utility files

**Database:**

- 52 tables
- 220+ columns
- 55+ foreign keys
- 25+ indexes

---

## 🎯 Use Cases

### Scenario: "I need to add a new ERP module"

1. **Understand existing architecture:**
   - Read [TECHNICAL_DOCUMENTATION.md - Section 2](./TECHNICAL_DOCUMENTATION.md#2-architecture--technology-stack)

2. **Plan database changes:**
   - Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
   - Create migration

3. **Build backend:**
   - Create model, controller, service
   - Implement GL posting if financial
   - Follow patterns in [TECHNICAL_DOCUMENTATION.md - Section 3](./TECHNICAL_DOCUMENTATION.md#3-backend-documentation-backend)

4. **Build frontend:**
   - Create page component
   - Add API integration
   - Add to navigation
   - Follow [TECHNICAL_DOCUMENTATION.md - Section 4](./TECHNICAL_DOCUMENTATION.md#4-frontend-documentation-frontend)

5. **Document API:**
   - Add to [API_REFERENCE.md](./API_REFERENCE.md)

6. **Update User Guide:**
   - Add to [USER_GUIDE.md](./USER_GUIDE.md) (Arabic & English)

### Scenario: "I'm getting an error"

1. Check [TECHNICAL_DOCUMENTATION.md - Section 10](./TECHNICAL_DOCUMENTATION.md#10-troubleshooting--common-issues)
2. Review logs: `backend/storage/logs/laravel.log`
3. Consult relevant section based on error type

### Scenario: "I need to deploy to production"

1. Follow [TECHNICAL_DOCUMENTATION.md - Section 11](./TECHNICAL_DOCUMENTATION.md#11-deployment-guide)
2. Complete all checklist items
3. Configure environment variables
4. Run migrations
5. Set up queue workers

### Scenario: "I need to understand a financial workflow"

1. Check [USER_GUIDE.md](./USER_GUIDE.md) for business process
2. Review [TECHNICAL_DOCUMENTATION.md - Section 7](./TECHNICAL_DOCUMENTATION.md#7-business-logic--services) for implementation
3. Trace through relevant Service class

---

## 📝 Documentation Standards

All documentation follows these principles:

- **Comprehensive:** Every feature documented
- **Accurate:** Reflects actual codebase
- **Practical:** Includes examples and use cases
- **Searchable:** Clear headers and structure
- **Bilingual:** User Guide in Arabic & English
- **Versioned:** Dated and version-tracked

---

## 🔄 Documentation Updates

**Last Updated:** February 5, 2026  
**Version:** 2.2  
**Codebase Version:** Laravel 12 + Next.js 16

### Update Policy

Documentation should be updated when:

- New features are added
- Major refactoring occurs
- API contracts change
- Database schema changes
- ERP workflows change
- Deployment procedures change

---

## 📞 Support Resources

**Documentation Issues:**

- Submit documentation bugs via GitHub Issues
- Tag with `documentation` label

**Code Questions:**

- Review relevant documentation section first
- Check code comments in source files
- Consult [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md)

**Quick Reference:**

- Backend: `backend/app/Http/Controllers/Api/`
- Frontend: `frontend/app/`
- Database: `backend/database/migrations/`
- API: [API_REFERENCE.md](./API_REFERENCE.md)

---

## 🏆 Best Practices

When using this documentation:

1. **Start with README.md** for quick orientation
2. **Use USER_GUIDE.md** to understand business processes
3. **Use TECHNICAL_DOCUMENTATION.md** as main developer reference
4. **Consult DATABASE_SCHEMA.md** for data modeling
5. **Reference API_REFERENCE.md** for API integration
6. **Keep documentation open** while coding
7. **Update documentation** when you change code

---

## 📋 Checklist for New Team Members

- [ ] Read README.md (5 minutes)
- [ ] Complete local setup (10 minutes)
- [ ] Review ERP System Overview (15 minutes)
- [ ] Understand ERP modules in USER_GUIDE.md (30 minutes)
- [ ] Explore database schema (20 minutes)
- [ ] Run the application locally
- [ ] Make a test API call
- [ ] Review codebase structure
- [ ] Read your role-specific documentation section
- [ ] Set up development environment

**Estimated Time:** 2-3 hours total

---

## 🗺️ Visual Documentation Map

```txt
ACCSYSTEM-erp/
│
├── 📄 README.md
│   ├─► Quick Start
│   ├─► ERP Module Overview
│   └─► Installation
│
├── 🤝 CONTRIBUTING.md
│   └─► Contribution Guidelines
│
└── docs/
    │
    ├── 📘 TECHNICAL_DOCUMENTATION.md ⭐ MAIN
    │   ├─► Section 1: System Overview
    │   ├─► Section 2: Architecture
    │   ├─► Section 3: Backend (Laravel)
    │   ├─► Section 4: Frontend (Next.js)
    │   ├─► Section 5: Database Schema
    │   ├─► Section 6: API Contracts
    │   ├─► Section 7: Business Logic
    │   ├─► Section 8: Security
    │   ├─► Section 9: Developer Onboarding
    │   ├─► Section 10: Troubleshooting
    │   └─► Section 11: Deployment
    │
    ├── 📖 USER_GUIDE.md (العربية/English)
    │   ├─► مقدمة عن النظام
    │   ├─► الوحدات الأساسية (12 modules)
    │   ├─► الدورات المستندية
    │   ├─► الأدوار والصلاحيات
    │   └─► أسئلة شائعة
    │
    ├── 📊 DATABASE_SCHEMA.md
    │   ├─► 52 Tables
    │   ├─► ERD Diagrams
    │   ├─► Relationships
    │   └─► Constraints
    │
    ├── 🔌 API_REFERENCE.md
    │   ├─► Authentication
    │   ├─► Sales
    │   ├─► Purchases
    │   ├─► Inventory
    │   ├─► GL
    │   ├─► Reports
    │   ├─► HR & Payroll
    │   └─► Admin
    │
    └── 📑 DOCUMENTATION_INDEX.md (this file)
        └─► Navigation Guide
```

---

**Start your journey with [README.md](./../README.md) →**
