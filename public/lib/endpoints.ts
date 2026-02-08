
/**
 * Centralized API Endpoints
 * All endpoints are defined here to ensure backend compatibility and easy management.
 * 
 * Usage:
 * import { API_ENDPOINTS } from '@/lib/endpoints';
 * fetchAPI(API_ENDPOINTS.AUTH.LOGIN, ...);
 */

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: "/login",
        LOGOUT: "/logout",
        CHECK: "/check",
    },
    SYSTEM: {
        SETTINGS: {
            INDEX: "/settings",
            STORE: "/settings/store",
            INVOICE: "/settings/invoice",
            ZATCA: "/settings/zatca",
        },
        GOVERNMENT_FEES: {
            BASE: "/government_fees",
            withId: (id: string | number) => `/government_fees/${id}`,
        },
        AUDIT: {
            LOGS: "/audit-logs",
            TRAIL: "/audit-trail",
        },
        USERS: {
            BASE: "/users",
            CHANGE_PASSWORD: "/change_password",
            MANAGERS: "/manager_list",
            MANAGERS_ALT: "/users/managers",
            ROLES: "/roles",
            ROLES_WITH_ID: (id: string | number) => `/roles/${id}`,
            MY_SESSIONS: "/my_sessions",
            SESSIONS: "/sessions",
            SESSIONS_WITH_ID: (id: string | number) => `/sessions/${id}`,
        },
        BATCH: "/batch",
    },
    FINANCE: {
        GL: {
            TRIAL_BALANCE: "/trial-balance",
            ENTRIES: "/ledger/entries",
            ACCOUNT_ACTIVITY: "/ledger/account-activity",
            ACCOUNT_DETAILS: "/ledger/account-details",
            BALANCE_HISTORY: "/ledger/balance-history",
        },
        JOURNAL_VOUCHERS: {
            BASE: "/journal-vouchers",
            withId: (id: string | number) => `/journal-vouchers/${id}`,
            POST: (id: string | number) => `/vouchers/${id}/post`,
        },
        FISCAL_PERIODS: {
            BASE: "/fiscal-periods",
            CLOSE: "/fiscal-periods/close",
            LOCK: "/fiscal-periods/lock",
            UNLOCK: "/fiscal-periods/unlock",
        },
        ACCOUNTS: {
            BASE: "/accounts",
            withId: (id: string | number) => `/accounts/${id}`,
            BALANCES: "/accounts/balances",
        },
        ACCRUAL: "/accrual",
        RECONCILIATION: "/reconciliation",
        RECURRING: {
            BASE: "/recurring_transactions",
            withId: (id: string | number) => `/recurring_transactions/${id}`,
            PROCESS: "/recurring_transactions/process",
        },
        CURRENCIES: {
            BASE: "/currencies",
            withId: (id: string | number) => `/currencies/${id}`,
            TOGGLE: (id: string | number) => `/currencies/${id}/toggle`,
        },
        CURRENCY_POLICIES: {
            BASE: "/currency-policies",
            ACTIVE: "/currency-policies/active",
            TYPES: "/currency-policies/types",
            EXCHANGE_RATES: {
                HISTORY: "/currency-policies/exchange-rates/history",
                CURRENT: "/currency-policies/exchange-rates/current",
                BASE: "/currency-policies/exchange-rates",
            },
            CONVERT: "/currency-policies/convert",
            REVALUATE: "/currency-policies/revaluate",
            withId: (id: string | number) => `/currency-policies/${id}`,
            ACTIVATE: (id: string | number) => `/currency-policies/${id}/activate`,
        },
        EXPENSES: "/expenses",
        ASSETS: "/assets",
        REVENUES: "/revenues",
        AR: {
            CUSTOMERS: "/ar/customers",
            LEDGER: "/ar/ledger",
            TRANSACTIONS: "/ar/transactions",
        }
    },
    HR: {
        EMPLOYEES: {
            BASE: "/employees",
            withId: (id: string | number) => `/employees/${id}`,
            SUSPEND: (id: string | number) => `/employees/${id}/suspend`,
            ACTIVATE: (id: string | number) => `/employees/${id}/activate`,
            DOCUMENTS: (id: string | number) => `/employees/${id}/documents`,
        },
        DEPARTMENTS: "/departments",
        PAYROLL: {
            CYCLES: "/payroll/cycles",
            GENERATE: "/payroll/generate",
            APPROVE: (id: string | number) => `/payroll/${id}/approve`,
            PROCESS_PAYMENT: (id: string | number) => `/payroll/${id}/process-payment`,
            CYCLE_ITEMS: (cycleId: string | number) => `/payroll/cycles/${cycleId}/items`,
            ITEM_TRANSACTIONS: (itemId: string | number) => `/payroll/items/${itemId}/transactions`,
            PAY_ITEM: (itemId: string | number) => `/payroll/items/${itemId}/pay`,
            TOGGLE_ITEM: (itemId: string | number) => `/payroll/items/${itemId}/toggle-status`,
            UPDATE_ITEM: (itemId: string | number) => `/payroll/items/${itemId}`,
        },
        ATTENDANCE: {
            BASE: "/attendance",
            BULK_IMPORT: "/attendance/bulk-import",
            SUMMARY: "/attendance/summary",
        },
        LEAVE: {
            BASE: "/leave-requests",
            withId: (id: string | number) => `/leave-requests/${id}`,
            APPROVE: (id: string | number) => `/leave-requests/${id}/approve`,
            CANCEL: (id: string | number) => `/leave-requests/${id}/cancel`,
        },
        EMPLOYEE_PORTAL: {
            PAYSLIPS: "/employee-portal/my-payslips",
            LEAVE_REQUESTS: "/employee-portal/my-leave-requests",
            ATTENDANCE: "/employee-portal/my-attendance",
        },
        EOSB: {
            PREVIEW: "/eosb/preview",
            CALCULATE: (id: string | number) => `/eosb/${id}/calculate`,
        },
        COMPONENTS: "/payroll-components",
    },
    INVENTORY: {
        PRODUCTS: "/products",
        CATEGORIES: "/categories",
        BATCH: "/batch",
        PERIODIC: {
            BASE: "/inventory/periodic",
            PROCESS: "/inventory/periodic/process",
            VALUATION: "/inventory/periodic/valuation",
        }
    },
    SALES: {
        INVOICES: "/invoices",
        INVOICE_BY_ID: (id: string | number) => `/invoices/${id}`,
        INVOICE_DETAILS: "/invoice_details",
        RETURNS: {
            BASE: "/sales/returns",
            SHOW: "/sales/returns/show",
        },
        ZATCA: {
            SUBMIT: (id: string | number) => `/invoices/${id}/zatca/submit`,
            STATUS: (id: string | number) => `/invoices/${id}/zatca/status`,
        }
    },
    PURCHASES: {
        BASE: "/purchases",
        REQUESTS: "/requests",
        APPROVE: "/purchases/approve",
        SUPPLIERS: {
            BASE: "/ap/suppliers",
            TRANSACTIONS: "/ap/transactions",
            PAYMENT: "/ap/payment",
            LEDGER: "/ap/ledger",
        }
    },
    REPORTS: {
        BALANCE_SHEET: "/reports/balance_sheet",
        PROFIT_LOSS: "/reports/profit_loss",
        CASH_FLOW: "/reports/cash_flow",
        AGING_RECEIVABLES: "/reports/aging_receivables",
        AGING_PAYABLES: "/reports/aging_payables",
        COMPARATIVE: "/reports/comparative",
        DASHBOARD: "/dashboard",
    }
};
