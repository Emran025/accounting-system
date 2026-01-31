# Documentation Index

> **Complete Documentation Suite for Accounting System**

Welcome to the comprehensive documentation for the Enterprise Accounting System. This index provides quick access to all documentation resources.

---

## 📚 Documentation Structure

### Core Documentation

1. **[README.md](./../README.md)**
   - Quick start guide
   - Project overview
   - Installation instructions
   - Basic usage

2. **[USER_GUIDE.md](./USER_GUIDE.md)** ⭐ **للمستخدمين | For Users**
   - دليل مبسط بالعربية والإنجليزية
   - شرح جميع أقسام النظام
   - من يستخدم كل قسم
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

1. [TECHNICAL_DOCUMENTATION.md - Section 3](./TECHNICAL_DOCUMENTATION.md#3-backend-documentation-src)
2. [TECHNICAL_DOCUMENTATION.md - Section 7](./TECHNICAL_DOCUMENTATION.md#7-business-logic--services)
3. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
4. [API_REFERENCE.md](./API_REFERENCE.md)

### For Frontend Developers

Master the Next.js frontend:

1. [TECHNICAL_DOCUMENTATION.md - Section 4](./TECHNICAL_DOCUMENTATION.md#4-frontend-documentation-public)
2. [API_REFERENCE.md](./API_REFERENCE.md) for API integration
3. TypeScript interfaces in `public/lib/types.ts`

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

Integrate with the system:

1. [API_REFERENCE.md](./API_REFERENCE.md) - Complete API docs
2. [TECHNICAL_DOCUMENTATION.md - Section 6](./TECHNICAL_DOCUMENTATION.md#6-api-surface--contracts)

---

## 📖 Documentation Content Map

### TECHNICAL_DOCUMENTATION.md Sections

| Section | Content | Best For |
| --------- | --------- | ---------- |
| 1. System Overview | Architecture, business modules | Everyone |
| 2. Architecture & Tech Stack | Technologies, design patterns | Architects, Developers |
| 3. Backend Documentation | Laravel setup, controllers, services | Backend Devs |
| 4. Frontend Documentation | Next.js setup, routing, components | Frontend Devs |
| 5. Database Schema & Models | Table structures, relationships | Backend Devs, DBAs |
| 6. API Surface & Contracts | Endpoint examples, contracts | Integration Devs |
| 7. Business Logic & Services | Core services, workflows | Backend Devs |
| 8. Security & Authentication | Auth flow, permissions, security | Security, Backend Devs |
| 9. Developer Onboarding | Setup, workflow, guidelines | New Developers |
| 10. Troubleshooting | Common issues, solutions | All Developers |
| 11. Deployment Guide | Production setup, server config | DevOps |

### DATABASE_SCHEMA.md Sections

| Section | Content |
| --------- | --------- |
| Overview | Table groups, categories |
| Detailed ERD | Visual relationships (text format) |
| Key Relationships | Foreign keys, cascades |
| Indexes & Constraints | Performance, data integrity |
| Normalization | Design principles |

### API_REFERENCE.md Sections

| Section | Endpoints |
| --------- | ----------- |
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

**Business Logic:**

- [TECHNICAL_DOCUMENTATION.md - Section 7](./TECHNICAL_DOCUMENTATION.md#7-business-logic--services)
- Backend service files in `src/app/Services/`

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

### Scenario: "I need to add a new module"

1. **Understand existing architecture:**
   - Read [TECHNICAL_DOCUMENTATION.md - Section 2](./TECHNICAL_DOCUMENTATION.md#2-architecture--technology-stack)

2. **Plan database changes:**
   - Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
   - Create migration

3. **Build backend:**
   - Create model, controller, service
   - Follow patterns in [TECHNICAL_DOCUMENTATION.md - Section 3](./TECHNICAL_DOCUMENTATION.md#3-backend-documentation-src)

4. **Build frontend:**
   - Create page component
   - Add API integration
   - Follow [TECHNICAL_DOCUMENTATION.md - Section 4](./TECHNICAL_DOCUMENTATION.md#4-frontend-documentation-public)

5. **Document API:**
   - Add to [API_REFERENCE.md](./API_REFERENCE.md)

### Scenario: "I'm getting an error"

1. Check [TECHNICAL_DOCUMENTATION.md - Section 10](./TECHNICAL_DOCUMENTATION.md#10-troubleshooting--common-issues)
2. Review logs: `src/storage/logs/laravel.log`
3. Consult relevant section based on error type

### Scenario: "I need to deploy to production"

1. Follow [TECHNICAL_DOCUMENTATION.md - Section 11](./TECHNICAL_DOCUMENTATION.md#11-deployment-guide)
2. Complete all checklist items
3. Configure environment variables
4. Run migrations
5. Set up queue workers

---

## 📝 Documentation Standards

All documentation follows these principles:

- **Comprehensive:** Every feature documented
- **Accurate:** Reflects actual codebase
- **Practical:** Includes examples and use cases
- **Searchable:** Clear headers and structure
- **Versioned:** Dated and version-tracked

---

## 🔄 Documentation Updates

**Last Updated:** January 31, 2026  
**Version:** 2.1  
**Codebase Version:** Laravel 12 + Next.js 16

### Update Policy

Documentation should be updated when:

- New features are added
- Major refactoring occurs
- API contracts change
- Database schema changes
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

- Backend: `src/app/Http/Controllers/Api/`
- Frontend: `public/app/`
- Database: `src/database/migrations/`
- API: [API_REFERENCE.md](./API_REFERENCE.md)

---

## 🏆 Best Practices

When using this documentation:

1. **Start with README.md** for quick orientation
2. **Use TECHNICAL_DOCUMENTATION.md** as main reference
3. **Consult DATABASE_SCHEMA.md** for data modeling
4. **Reference API_REFERENCE.md** for API integration
5. **Keep documentation open** while coding
6. **Update documentation** when you change code

---

## 📋 Checklist for New Team Members

- [ ] Read README.md (5 minutes)
- [ ] Complete local setup (10 minutes)
- [ ] Review System Overview (15 minutes)
- [ ] Explore database schema (20 minutes)
- [ ] Run the application locally
- [ ] Make a test API call
- [ ] Review codebase structure
- [ ] Read your role-specific documentation section
- [ ] Join team communication channels
- [ ] Set up development environment

**Estimated Time:** 2-3 hours total

---

## 🗺️ Visual Documentation Map

```txt
accounting-system/
│
├── 📄 README.md
│   ├─► Quick Start
│   ├─► Features Overview
│   └─► Installation
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
├── 📊 DATABASE_SCHEMA.md
│   ├─► 49 Tables
│   ├─► ERD Diagrams
│   ├─► Relationships
│   └─► Constraints
│
├── 🔌 API_REFERENCE.md
│   ├─► Authentication
│   ├─► Sales
│   ├─► Purchases
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
