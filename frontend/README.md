# ACCSYSTEM ERP System - Frontend

> **Next.js 16 Frontend for ACCSYSTEM ERP System**

This is the frontend application for the ACCSYSTEM ERP System, built with Next.js 16, React 19, and TypeScript.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the ERP system.

### Default Credentials

- **Username:** admin
- **Password:** admin

## 📁 Project Structure

```txt
public/
├── app/                    # App Router pages
│   ├── auth/login/         # Authentication
│   ├── system/             # Dashboard, Settings, Reports
│   ├── sales/              # Sales & Invoicing
│   ├── purchases/          # Purchases & Expenses
│   ├── finance/            # GL, Chart of Accounts, Fiscal Periods
│   ├── hr/                 # HR & Payroll
│   └── navigation/         # Navigation Landing Page
├── components/             # Reusable React components
│   ├── ui/                 # 34 UI components
│   └── navigation/         # 4 Navigation components
├── lib/                    # Utilities & types
│   ├── api.ts              # API client
│   ├── types.ts            # TypeScript interfaces
│   └── auth.ts             # Auth utilities
└── public/                 # Static assets
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev         # Start development server (port 3000)

# Production
npm run build       # Build for production
npm start           # Start production server

# Linting
npm run lint        # Run ESLint
```

## 🔌 API Configuration

The frontend connects to the Laravel backend API. Configure the API URL:

**Option 1:** Environment file (`.env.local`):

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000/api
```

**Option 2:** Default fallback is already configured in `lib/api.ts`.

## 📖 Documentation

- **Main Documentation:** [../README.md](../README.md)
- **Technical Docs:** [../docs/TECHNICAL_DOCUMENTATION.md](../docs/TECHNICAL_DOCUMENTATION.md)
- **API Reference:** [../docs/API_REFERENCE.md](../docs/API_REFERENCE.md)
- **User Guide:** [../docs/USER_GUIDE.md](../docs/USER_GUIDE.md)

## 🎨 Styling

- **Framework:** Tailwind CSS 4
- **Global Styles:** `app/globals.css`
- **Design System:** Premium SaaS aesthetic with Arabic RTL support

## 📦 Key Dependencies

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **qrcode** - QR code generation for ZATCA compliance

---

> Part of the **ACCSYSTEM ERP System**
