# State Management Refactoring Plan

## ACCSYSTEM Frontend — Next.js 16 / React 19

> **Date:** February 11, 2026  
> **Scope:** `C:\xampp\htdocs\accsystem\frontend`  
> **Current Stack:** Next.js 16.1.6, React 19.2.3, TypeScript 5  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Problems Identified](#3-problems-identified)
4. [State Management Solution Comparison](#4-state-management-solution-comparison)
5. [Recommended Solution: Zustand](#5-recommended-solution-zustand)
6. [Architecture Design](#6-architecture-design)
7. [Phased Refactoring Plan](#7-phased-refactoring-plan)
8. [Code Examples & Patterns](#8-code-examples--patterns)
9. [File Structure](#9-file-structure)
10. [Migration Checklist](#10-migration-checklist)

---

## 1. Executive Summary

The ACCSYSTEM frontend currently manages state through a combination of **local `useState` hooks**, **ad-hoc custom hooks** (`useProducts`, `useCustomers`, `usePurchases`, `useSuppliers`), **React Context** (Auth only), and **direct `localStorage` access**. There is **no centralized state management library** in use.

This report recommends **Zustand** as the optimal state management solution for this project, based on its:
- Minimal boilerplate and bundle size (~1KB)
- First-class TypeScript support
- Compatibility with React 19 and Next.js App Router
- Store-based architecture ideal for large enterprise applications
- Built-in middleware for persistence, devtools, and subscriptions

---

## 2. Current State Analysis

### 2.1 Existing Patterns

| Pattern | Where Used | Files Count |
|---------|-----------|-------------|
| Local `useState` hooks | All page components | ~70+ files |
| Custom data-fetching hooks | Products, Customers, Purchases, Suppliers | 4 files |
| React Context (Auth) | `MainLayout.tsx`,| 2 files |
| Module-level variable cache | `api.ts` (`systemSettings`) | 1 file |
| `localStorage` for auth | `auth.ts` | 1 file |

### 2.2 Auth State Flow

```
localStorage ← storeAuth() / clearAuth()
     ↓
MainLayout.tsx → checkAuth() → useState(user, permissions)
     ↓
AuthContext (created but NOT provided to children via <AuthContext.Provider>)
     ↓
Sidebar receives permissions as props
```

**Critical Issue:** The `AuthContext` is defined in `MainLayout.tsx` (line 140) and  (line 143) but **never wrapped with a `<Provider>`**. The `useAuth()` hook always returns `{ user: null, permissions: [] }`.

### 2.3 Data Fetching Pattern (Typical Component)

```
Component mounts → useEffect → fetchAPI(endpoint) → useState(data)
                                                    → useState(isLoading)
                                                    → useState(currentPage)
                                                    → useState(totalPages)
```

Every component independently manages:
- Fetching data from API
- Loading state
- Pagination state
- Search/filter state
- Error handling
- CRUD operations

### 2.4 Custom Hooks Pattern

The 4 existing custom hooks (`useProducts`, `useCustomers`, `usePurchases`, `useSuppliers`) follow an identical pattern:

```typescript
function useXxx() {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = useCallback(async (page, search) => { ... }, []);
  const saveItem = useCallback(async (data, id?) => { ... }, []);
  const deleteItem = useCallback(async (id) => { ... }, []);

  return { items, currentPage, totalPages, isLoading, loadItems, saveItem, deleteItem };
}
```

**Problems:** These hooks re-instantiate state on every mount. They share no state between sibling components which may need the same data (e.g., employee lists from different HR sub-modules).

---

## 3. Problems Identified

### 3.1 Critical Issues

| # | Problem | Impact | Affected Areas |
|---|---------|--------|----------------|
| 1 | **No shared global state** — Auth context defined but never provided | Child components cannot access user/permissions reactively | All modules |
| 2 | **Duplicated data fetching** — Employee list fetched independently in Leave, Contracts, Payroll, and 25+ HR modules | Redundant API calls, inconsistent data between views | HR module |
| 3 | **No server state caching** — Every navigation triggers a full refetch | Slow UX, unnecessary backend load | All pages |
| 4 | **Fragile auth sync** — Relies on `localStorage` with no reactive updates | Auth state can desync between tabs/components | Auth flow |
| 5 | **Module-level mutable cache** — `systemSettings` in `api.ts` is a mutable global | Not reactive, SSR-unsafe, no invalidation strategy | System settings |

### 3.2 Scalability Concerns

| # | Problem | Impact |
|---|---------|--------|
| 6 | **Massive component state** — `Payroll.tsx` has 30+ `useState` calls in 823 lines | Hard to maintain, test, or split |
| 7 | **No state devtools** — Impossible to inspect/debug state at runtime | Slows development |
| 8 | **No optimistic updates** — All mutations block on server response | Perceived slow UI |
| 9 | **Scattered `any` types** — Data fetching uses `as any` extensively | Type safety is compromised |
| 10 | **No error boundary state** — Errors are caught per-component with `try/catch` | No unified error handling |

### 3.3 Code Duplication Metrics

- **Estimated 300+ `useState` calls** across the `app/` directory
- **Identical pagination logic** replicated in 15+ components
- **Employee list fetching** duplicated in ~25 HR sub-modules
- **Loading/error state boilerplate** repeated in every data-fetching component

---

## 4. State Management Solution Comparison

### 4.1 Candidates Evaluated

| Criteria | Redux Toolkit | Zustand | Jotai | TanStack Query | Recoil |
|----------|:------------:|:-------:|:-----:|:--------------:|:------:|
| **Bundle Size** | ~33KB | ~1KB | ~3KB | ~13KB | ~21KB |
| **Boilerplate** | High | Very Low | Low | Medium | Medium |
| **TypeScript DX** | Good | Excellent | Good | Excellent | Fair |
| **React 19 Ready** | ✅ | ✅ | ✅ | ✅ | ❌ Deprecated |
| **Next.js App Router** | ⚠️ Complex | ✅ Native | ✅ | ✅ | ❌ |
| **Devtools** | ✅ Built-in | ✅ Middleware | ✅ | ✅ Built-in | ✅ |
| **Server State** | Manual | Manual | Manual | ✅ Built-in | Manual |
| **Persistence** | Manual | ✅ Middleware | ✅ | ✅ | Manual |
| **Learning Curve** | Steep | Gentle | Gentle | Medium | Medium |
| **Large Project Fit** | ✅ Proven | ✅ Proven | ⚠️ Atomic only | ✅ Server focus | ❌ |
| **Incremental Adoption** | Difficult | ✅ Easy | ✅ Easy | ✅ Easy | Difficult |

### 4.2 Why NOT Redux Toolkit

- Excessive boilerplate for this project's needs (actions, reducers, slices, selectors)
- Requires wrapping the entire app with `<Provider>` — problematic with Next.js App Router
- The project has no existing Redux infrastructure; migration cost is high
- Overkill for the current architecture which is component-centric

### 4.3 Why NOT TanStack Query Alone

- TanStack Query excels at **server state** (caching, refetching, mutations) but does not manage **client state** (UI state, form state, sidebar collapse, dialog visibility)
- This project needs both server AND client state management
- **Recommendation:** Use TanStack Query **in combination** with Zustand in a later phase if server-state caching becomes a priority

### 4.4 Why Zustand Wins

1. **Zero-config Provider-free architecture** — Stores are created outside React, no `<Provider>` wrapper needed. This is critical for Next.js App Router where layouts are server components.
2. **Incremental migration** — Can be adopted one store at a time without touching existing code.
3. **Tiny bundle** — ~1KB gzipped, no impact on load times.
4. **Middleware ecosystem** — `persist` (localStorage sync), `devtools` (Redux DevTools), `immer` (immutable updates), `subscribeWithSelector`.
5. **Battle-tested at scale** — Used by Vercel, Cloudflare, and many enterprise apps.
6. **TypeScript-first** — Full inference, no type gymnastics.

---

## 5. Recommended Solution: Zustand

### 5.1 Installation

```bash
npm install zustand
```

### 5.2 Store Architecture

The state will be organized into **domain-specific stores** following a modular pattern:

```
stores/
├── useAuthStore.ts          # Auth state (user, permissions, session)
├── useSettingsStore.ts      # System settings (replaces module-level cache)
├── useUIStore.ts            # UI state (sidebar, theme, notifications)
├── useEmployeeStore.ts      # Employee data (shared across HR modules)
├── usePayrollStore.ts       # Payroll cycles, items, transactions
├── useLeaveStore.ts         # Leave requests
├── useProductStore.ts       # Inventory products
├── useCustomerStore.ts      # AR customers
├── useSupplierStore.ts      # AP suppliers
├── usePurchaseStore.ts      # Purchases
└── useFinanceStore.ts       # GL, accounts, journals
```

---

## 6. Architecture Design

### 6.1 Store Layers

```
┌────────────────────────────────────────────────────────┐
│                    React Components                     │
│   (consume store via hooks, minimal local state)        │
├────────────────────────────────────────────────────────┤
│                    Zustand Stores                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Auth     │  │ UI       │  │ Domain Stores        │  │
│  │ Store    │  │ Store    │  │ (Employee, Payroll,  │  │
│  │          │  │          │  │  Products, etc.)     │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
├────────────────────────────────────────────────────────┤
│                    API Layer                            │
│         fetchAPI() + API_ENDPOINTS (unchanged)          │
├────────────────────────────────────────────────────────┤
│                    Backend (Laravel)                    │
└────────────────────────────────────────────────────────┘
```

### 6.2 State Categories

| Category | Managed By | Examples |
|----------|-----------|----------|
| **Global Client State** | Zustand (Auth, UI, Settings) | User session, sidebar state, theme, notifications |
| **Domain Server State** | Zustand (Domain Stores) | Employee list, payroll cycles, products |
| **Local Component State** | `useState` (kept) | Form inputs, dialog open/close, temporary UI flags |
| **URL State** | Next.js Router (kept) | Current page route, dynamic params |

### 6.3 Middleware Strategy

```typescript
// Auth store: persist to localStorage, sync across tabs
useAuthStore = create(
  persist(
    devtools((set, get) => ({ ... })),
    { name: 'auth-storage' }
  )
);

// UI store: persist sidebar preference only
useUIStore = create(
  persist(
    devtools((set) => ({ ... })),
    { name: 'ui-preferences', partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }) }
  )
);

// Domain stores: devtools only (server is source of truth)
useEmployeeStore = create(
  devtools((set, get) => ({ ... }))
);
```

---

## 7. Phased Refactoring Plan

### Phase 1: Foundation (Week 1)
**Goal:** Install Zustand. Create Auth, Settings, and UI stores. Wire them into layouts.

| # | Task | Files Affected | Priority |
|---|------|---------------|----------|
| 1.1 | Install `zustand` | `package.json` | P0 |
| 1.2 | Create `stores/useAuthStore.ts` | New file | P0 |
| 1.3 | Create `stores/useSettingsStore.ts` | New file | P0 |
| 1.4 | Create `stores/useUIStore.ts` | New file | P0 |
| 1.5 | Refactor `MainLayout.tsx` to use `useAuthStore` | `components/layout/MainLayout.tsx` | P0 |

| 1.7 | Remove dead `AuthContext` / `ModuleAuthContext` | Both layout files | P0 |
| 1.8 | Refactor `Sidebar.tsx` to read from `useAuthStore` | `components/layout/Sidebar.tsx` | P0 |
| 1.9 | Replace module-level `systemSettings` in `api.ts` with `useSettingsStore` | `lib/api.ts` | P1 |
| 1.10 | Replace `localStorage` sidebar state with `useUIStore` | Layout files | P1 |

**Deliverable:** Auth, settings, and UI state are centralized. No more dead contexts.

---

### Phase 2: Shared Domain Stores (Week 2)
**Goal:** Create the `useEmployeeStore` to eliminate the most impactful duplication (employee data shared across 25+ HR modules).

| # | Task | Files Affected | Priority |
|---|------|---------------|----------|
| 2.1 | Create `stores/useEmployeeStore.ts` with CRUD + cache | New file | P0 |
| 2.2 | Refactor `Employees.tsx` to use store | `app/hr/employees/Employees.tsx` | P0 |
| 2.3 | Refactor `LeaveRequests.tsx` to use shared employee list | `app/hr/leave/LeaveRequests.tsx` | P0 |
| 2.4 | Refactor `ContractForm.tsx` to use shared employee list | `app/hr/contracts/ContractForm.tsx` | P0 |
| 2.5 | Refactor `Payroll.tsx` to use shared employee list | `app/hr/payroll/Payroll.tsx` | P0 |
| 2.6 | Refactor all remaining HR modules loading employees | ~20 HR component files | P1 |
| 2.7 | Create `stores/usePayrollStore.ts` | New file | P1 |
| 2.8 | Decompose `Payroll.tsx` (823 lines) into sub-components + store | `app/hr/payroll/` | P1 |

**Deliverable:** Employee data fetched once, shared everywhere. Payroll component decomposed.

---

### Phase 3: Financial & Inventory Domain Stores (Week 3)
**Goal:** Migrate the existing custom hooks to Zustand stores.

| # | Task | Files Affected | Priority |
|---|------|---------------|----------|
| 3.1 | Create `stores/useProductStore.ts` (replaces `useProducts.ts`) | New file, delete old | P0 |
| 3.2 | Create `stores/useCustomerStore.ts` (replaces `useCustomers.ts`) | New file, delete old | P0 |
| 3.3 | Create `stores/useSupplierStore.ts` (replaces `useSuppliers.ts`) | New file, delete old | P0 |
| 3.4 | Create `stores/usePurchaseStore.ts` (replaces `usePurchases.ts`) | New file, delete old | P0 |
| 3.5 | Refactor consuming pages to use new stores | 4 page files | P0 |
| 3.6 | Create `stores/useFinanceStore.ts` | New file | P1 |
| 3.7 | Refactor GL, JV, Fiscal Periods pages | `app/finance/` | P1 |

**Deliverable:** All custom hooks replaced. Consistent store pattern across modules.

---

### Phase 4: Advanced Patterns (Week 4)
**Goal:** Add caching, optimistic updates, and generic utilities.

| # | Task | Files Affected | Priority |
|---|------|---------------|----------|
| 4.1 | Create `stores/middleware/withPagination.ts` generic | New file | P1 |
| 4.2 | Create `stores/middleware/withCRUD.ts` generic | New file | P1 |
| 4.3 | Add cache invalidation strategy (TTL-based) | All domain stores | P1 |
| 4.4 | Add optimistic update patterns for mutations | Domain stores | P2 |
| 4.5 | Add error boundary store for global error handling | New file | P2 |
| 4.6 | Integrate Redux DevTools for debugging | All stores | P1 |
| 4.7 | Create `stores/index.ts` barrel export | New file | P1 |
| 4.8 | Write unit tests for all stores | New test files | P2 |

**Deliverable:** Production-ready state management infrastructure with caching and devtools.

---

## 8. Code Examples & Patterns

### 8.1 Auth Store (Phase 1)

```typescript
// stores/useAuthStore.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  role_id: number;
  is_active: boolean;
  manager_id?: number;
}

export interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface AuthState {
  // State
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;

  // Actions
  checkAuth: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  canAccess: (module: string, action?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    devtools(
      (set, get) => ({
        // Initial state
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: true,
        sessionToken: null,

        // Check authentication with backend
        checkAuth: async () => {
          set({ isLoading: true });
          try {
            const response = await fetchAPI(API_ENDPOINTS.AUTH.CHECK);
            if (response.authenticated && response.user) {
              set({
                user: response.user as User,
                permissions: Array.isArray(response.permissions) ? response.permissions : [],
                isAuthenticated: true,
                sessionToken: (response.token as string) || get().sessionToken,
                isLoading: false,
              });
              return true;
            }
          } catch { /* fall through */ }

          set({ user: null, permissions: [], isAuthenticated: false, isLoading: false });
          return false;
        },

        // Login
        login: async (username, password) => {
          try {
            const response = await fetchAPI(API_ENDPOINTS.AUTH.LOGIN, {
              method: 'POST',
              body: JSON.stringify({ username, password }),
            });
            if (response.success && response.user) {
              set({
                user: response.user as User,
                permissions: Array.isArray(response.permissions) ? response.permissions : [],
                isAuthenticated: true,
                sessionToken: response.token as string,
              });
              return { success: true };
            }
            return { success: false, error: response.message || 'Login failed' };
          } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : 'Connection error' };
          }
        },

        // Logout
        logout: async () => {
          try { await fetchAPI(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' }); } catch {}
          set({ user: null, permissions: [], isAuthenticated: false, sessionToken: null });
        },

        // Permission check
        canAccess: (module, action = 'view') => {
          const { permissions } = get();
          const perm = permissions.find(p => p.module === module);
          if (!perm) return false;
          return action === 'view' ? perm.can_view
               : action === 'create' ? perm.can_create
               : action === 'edit' ? perm.can_edit
               : perm.can_delete;
        },

        setLoading: (loading) => set({ isLoading: loading }),
      }),
      { name: 'auth-store' }
    ),
    {
      name: 'accsystem-auth',
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
      }),
    }
  )
);
```

### 8.2 Employee Store (Phase 2) — With Caching

```typescript
// stores/useEmployeeStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { showToast } from '@/components/ui';
import { Employee } from '@/app/hr/types';

interface EmployeeState {
  // Data
  employees: Employee[];
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  departmentFilter: string;

  // Status
  isLoading: boolean;
  lastFetched: number | null;

  // Actions
  loadEmployees: (page?: number, search?: string, department?: string) => Promise<void>;
  getById: (id: number) => Employee | undefined;
  setSearchTerm: (term: string) => void;
  setDepartmentFilter: (dept: string) => void;
  invalidateCache: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useEmployeeStore = create<EmployeeState>()(
  devtools(
    (set, get) => ({
      employees: [],
      currentPage: 1,
      totalPages: 1,
      searchTerm: '',
      departmentFilter: '',
      isLoading: false,
      lastFetched: null,

      loadEmployees: async (page = 1, search, department) => {
        const state = get();
        const searchVal = search ?? state.searchTerm;
        const deptVal = department ?? state.departmentFilter;

        // Skip if recently fetched with same params
        if (
          state.lastFetched &&
          Date.now() - state.lastFetched < CACHE_TTL &&
          state.currentPage === page &&
          state.searchTerm === searchVal &&
          state.departmentFilter === deptVal &&
          state.employees.length > 0
        ) {
          return;
        }

        set({ isLoading: true });
        try {
          const query = new URLSearchParams({
            page: page.toString(),
            search: searchVal,
            department_id: deptVal,
          });
          const res = await fetchAPI(`${API_ENDPOINTS.HR.EMPLOYEES.BASE}?${query}`);
          set({
            employees: (res.data as Employee[]) || [],
            totalPages: Number(res.last_page) || 1,
            currentPage: page,
            searchTerm: searchVal,
            departmentFilter: deptVal,
            lastFetched: Date.now(),
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load employees', error);
          showToast('خطأ في تحميل الموظفين', 'error');
          set({ isLoading: false });
        }
      },

      getById: (id) => get().employees.find(e => e.id === id),

      setSearchTerm: (term) => set({ searchTerm: term }),
      setDepartmentFilter: (dept) => set({ departmentFilter: dept }),
      invalidateCache: () => set({ lastFetched: null }),
    }),
    { name: 'employee-store' }
  )
);
```

### 8.3 Generic CRUD Store Factory (Phase 4)

```typescript
// stores/factories/createCRUDStore.ts
import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAPI, APIResponse } from '@/lib/api';
import { showToast } from '@/components/ui';

interface CRUDState<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  lastFetched: number | null;

  load: (page?: number, search?: string) => Promise<void>;
  save: (data: Partial<T>, id?: number) => Promise<boolean>;
  remove: (id: number) => Promise<boolean>;
  invalidate: () => void;
}

interface CRUDConfig {
  endpoint: string;
  storeName: string;
  itemsPerPage?: number;
  cacheTTL?: number;
  messages?: {
    loadError?: string;
    saveSuccess?: string;
    updateSuccess?: string;
    saveError?: string;
    deleteSuccess?: string;
    deleteError?: string;
  };
}

export function createCRUDStore<T extends { id: number }>(config: CRUDConfig) {
  const {
    endpoint,
    storeName,
    itemsPerPage = 10,
    cacheTTL = 5 * 60 * 1000,
    messages = {},
  } = config;

  return create<CRUDState<T>>()(
    devtools(
      (set, get) => ({
        items: [],
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        lastFetched: null,

        load: async (page = 1, search = '') => {
          set({ isLoading: true });
          try {
            const res = await fetchAPI(
              `${endpoint}?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`
            );
            if (res.success) {
              set({
                items: (res.data as T[]) || [],
                totalPages: (res.pagination as any)?.total_pages || 1,
                currentPage: page,
                lastFetched: Date.now(),
              });
            }
          } catch {
            showToast(messages.loadError || 'خطأ في تحميل البيانات', 'error');
          } finally {
            set({ isLoading: false });
          }
        },

        save: async (data, id?) => {
          try {
            const res = await fetchAPI(endpoint, {
              method: id ? 'PUT' : 'POST',
              body: JSON.stringify(id ? { ...data, id } : data),
            });
            if (res.success) {
              showToast(
                id ? (messages.updateSuccess || 'تم التحديث بنجاح') : (messages.saveSuccess || 'تمت الإضافة بنجاح'),
                'success'
              );
              get().invalidate();
              return true;
            }
            showToast(res.message || messages.saveError || 'فشل الحفظ', 'error');
            return false;
          } catch {
            showToast(messages.saveError || 'خطأ في الحفظ', 'error');
            return false;
          }
        },

        remove: async (id) => {
          try {
            const res = await fetchAPI(`${endpoint}?id=${id}`, { method: 'DELETE' });
            if (res.success) {
              showToast(messages.deleteSuccess || 'تم الحذف', 'success');
              // Optimistic removal
              set(state => ({ items: state.items.filter(item => item.id !== id) }));
              return true;
            }
            showToast(res.message || messages.deleteError || 'فشل الحذف', 'error');
            return false;
          } catch {
            showToast(messages.deleteError || 'خطأ في الحذف', 'error');
            return false;
          }
        },

        invalidate: () => set({ lastFetched: null }),
      }),
      { name: storeName }
    )
  );
}
```

### 8.4 Usage of CRUD Factory

```typescript
// stores/useProductStore.ts
import { createCRUDStore } from './factories/createCRUDStore';
import { API_ENDPOINTS } from '@/lib/endpoints';
import { Product } from '@/app/inventory/products/types';

export const useProductStore = createCRUDStore<Product>({
  endpoint: API_ENDPOINTS.INVENTORY.PRODUCTS,
  storeName: 'product-store',
  messages: {
    loadError: 'خطأ في تحميل المنتجات',
    saveSuccess: 'تمت إضافة المنتج بنجاح',
    updateSuccess: 'تم تحديث المنتج بنجاح',
    deleteSuccess: 'تم حذف المنتج',
  },
});
```

### 8.5 Refactored Component Usage Example

```tsx
// BEFORE (current pattern)
export function LeaveRequests() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  // ... 8 more useState calls ...

  useEffect(() => {
    const loadEmployees = async () => {
      const res = await fetchAPI(API_ENDPOINTS.HR.EMPLOYEES.BASE);
      setEmployees(res.data || []);
    };
    loadEmployees();
  }, []);
  // ... rest of component
}

// AFTER (with Zustand)
export function LeaveRequests() {
  const { employees, loadEmployees } = useEmployeeStore();
  // Only local UI state remains in useState
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadEmployees(); // Cached — won't refetch if recently loaded
  }, [loadEmployees]);
  // ... cleaner component
}
```

---

## 9. File Structure

### New Files to Create

```
frontend/
├── stores/
│   ├── index.ts                          # Barrel exports
│   ├── useAuthStore.ts                   # Phase 1
│   ├── useSettingsStore.ts               # Phase 1
│   ├── useUIStore.ts                     # Phase 1
│   ├── useEmployeeStore.ts              # Phase 2
│   ├── usePayrollStore.ts              # Phase 2
│   ├── useLeaveStore.ts                # Phase 2
│   ├── useProductStore.ts              # Phase 3
│   ├── useCustomerStore.ts             # Phase 3
│   ├── useSupplierStore.ts             # Phase 3
│   ├── usePurchaseStore.ts             # Phase 3
│   ├── useFinanceStore.ts              # Phase 3
│   └── factories/
│       ├── createCRUDStore.ts           # Phase 4
│       └── createPaginatedStore.ts     # Phase 4
```

### Files to Modify

| File | Changes |
|------|---------|
| `components/layout/MainLayout.tsx` | Replace all `useState` + dead context with `useAuthStore` + `useUIStore` |
| `components/layout/Sidebar.tsx` | Read permissions from `useAuthStore` instead of props |
| `lib/api.ts` | Remove `systemSettings` module-level variable, use `useSettingsStore` |
| `lib/auth.ts` | Simplify to thin wrappers around `useAuthStore` (backward compat) |
| All HR module components (~25) | Replace inline employee fetching with `useEmployeeStore` |
| `app/inventory/products/useProducts.ts` | Replace with `useProductStore` (then delete) |
| `app/ar_customers/useCustomers.ts` | Replace with `useCustomerStore` (then delete) |
| `app/purchases/purchases/usePurchases.ts` | Replace with `usePurchaseStore` (then delete) |
| `app/ap_suppliers/useSuppliers.ts` | Replace with `useSupplierStore` (then delete) |

### Files to Delete (After Migration)

| File | Replaced By |
|------|-------------|
| `app/inventory/products/useProducts.ts` | `stores/useProductStore.ts` |
| `app/ar_customers/useCustomers.ts` | `stores/useCustomerStore.ts` |
| `app/purchases/purchases/usePurchases.ts` | `stores/usePurchaseStore.ts` |
| `app/ap_suppliers/useSuppliers.ts` | `stores/useSupplierStore.ts` |

---

## 10. Migration Checklist

### Pre-Migration

- [x] Install `zustand` dependency
- [ ] Set up Redux DevTools browser extension for debugging
- [x] Create `stores/` directory structure
- [ ] Verify all existing tests pass (baseline)

### Phase 1: Foundation

- [x] `useAuthStore` created and tested
- [x] `useSettingsStore` created and tested
- [x] `useUIStore` created and tested
- [x] `MainLayout.tsx` refactored — no more dead `AuthContext`
- [x] `Sidebar.tsx` uses `useAuthStore` directly
- [x] `api.ts` `systemSettings` replaced with store
- [x] `localStorage` sidebar state replaced with `useUIStore`
- [ ] Manual QA: login, navigation, permission checks work

### Phase 2: Shared Domain Stores

- [x] `useEmployeeStore` created with caching
- [x] All HR modules using shared employee list
- [x] `Payroll.tsx` decomposed into sub-components
- [x] `usePayrollStore` created
- [ ] Manual QA: all HR modules work correctly

### Phase 3: Financial & Inventory

- [x] Old custom hooks (`useProducts`, `useCustomers`, `usePurchases`, `useSuppliers`) replaced
- [x] All consuming pages refactored
- [x] Old hook files deleted
- [x] `useFinanceStore` created
- [ ] Manual QA: all financial modules work correctly

### Phase 4: Advanced Patterns

- [x] `createCRUDStore` factory created and applied
- [x] Cache invalidation strategy implemented
- [x] Redux DevTools integration verified
- [x] Optimistic updates for key mutations
- [x] Global error handling store
- [ ] All stores have unit tests
- [ ] Performance benchmarks (before vs. after)

---

## Appendix A: Decision Log

| Decision | Rationale |
|----------|-----------|
| Zustand over Redux | Less boilerplate, no Provider needed, better fit for incremental adoption in Next.js App Router |
| Zustand over Jotai | Jotai's atomic model is better for fine-grained reactivity; Zustand's store model is better for the clearly bounded CRUD domains in this project |
| Zustand over TanStack Query | TanStack Query is server-state only; this project needs client state too. Can be added later as complement |
| Persist middleware for Auth only | Other domain data should be re-fetched from the server; auth state needs to survive page reloads |
| Domain-specific stores over one global store | Separation of concerns, independent loading, easier testing, smaller re-render surface |
| CRUD factory pattern | Eliminates massive boilerplate for the ~10 domain stores that follow identical patterns |
| TTL-based cache invalidation | Simple, effective, and avoids stale data without WebSocket complexity |

## Appendix B: Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking auth during migration | Phase 1 focuses exclusively on auth; thorough QA before proceeding |
| Component re-renders increasing | Zustand's selector-based subscriptions naturally prevent unnecessary re-renders |
| Team learning curve | Zustand has the smallest API surface of any state management library (~5 methods) |
| Mixing old and new patterns during migration | Phases are designed so old hooks and new stores can coexist temporarily |
| SSR incompatibility | Zustand stores are client-side only; Next.js App Router server components won't use them directly |
