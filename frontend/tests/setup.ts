/**
 * Global test setup for Vitest.
 * Mocks browser APIs and common dependencies used by stores.
 */
import { vi } from 'vitest';

// ─── Mock fetch globally ──────────────────────────────────────
global.fetch = vi.fn();

// ─── Mock localStorage ────────────────────────────────────────
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ─── Mock showToast ───────────────────────────────────────────
vi.mock('@/components/ui', () => ({
    showToast: vi.fn(),
}));

// ─── Mock fetchAPI ────────────────────────────────────────────
vi.mock('@/lib/api', () => ({
    fetchAPI: vi.fn(),
}));

// ─── Mock API_ENDPOINTS ───────────────────────────────────────
vi.mock('@/lib/endpoints', () => ({
    API_ENDPOINTS: {
        AUTH: {
            CHECK: '/api/auth/check',
            LOGIN: '/api/auth/login',
            LOGOUT: '/api/auth/logout',
        },
        HR: {
            EMPLOYEES: { BASE: '/api/employees' },
            PAYROLL: {
                CYCLES: '/api/payroll/cycles',
                GENERATE: '/api/payroll/generate',
                CYCLE_ITEMS: (id: number) => `/api/payroll/cycles/${id}/items`,
                APPROVE: (id: number) => `/api/payroll/cycles/${id}/approve`,
                PROCESS_PAYMENT: (id: number) => `/api/payroll/cycles/${id}/payment`,
                TOGGLE_ITEM: (id: number) => `/api/payroll/items/${id}/toggle`,
                UPDATE_ITEM: (id: number) => `/api/payroll/items/${id}`,
                PAY_ITEM: (id: number) => `/api/payroll/items/${id}/pay`,
                ITEM_TRANSACTIONS: (id: number) => `/api/payroll/items/${id}/transactions`,
            },
        },
        FINANCE: {
            ACCOUNTS: { BASE: '/api/finance/accounts' },
        },
        PRODUCTS: { BASE: '/api/products' },
        CUSTOMERS: { BASE: '/api/customers' },
        SUPPLIERS: { BASE: '/api/suppliers' },
        PURCHASES: { BASE: '/api/purchases' },
    },
}));

// ─── Mock auth helpers ────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
    getSidebarLinks: vi.fn(() => []),
    Permission: {},
}));

// ─── Mock window.confirm ──────────────────────────────────────
global.confirm = vi.fn(() => true);
