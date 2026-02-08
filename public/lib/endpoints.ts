
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
        EXPAT_MANAGEMENT: {
            BASE: "/expat-management",
            withId: (id: string | number) => `/expat-management/${id}`,
        },
        EMPLOYEE_ASSETS: {
            BASE: "/employee-assets",
            withId: (id: string | number) => `/employee-assets/${id}`,
        },
        RECRUITMENT: {
            REQUISITIONS: {
                BASE: "/recruitment/requisitions",
                withId: (id: string | number) => `/recruitment/requisitions/${id}`,
            },
            APPLICANTS: {
                BASE: "/recruitment/applicants",
                STATUS: (id: string | number) => `/recruitment/applicants/${id}/status`,
            },
            INTERVIEWS: {
                BASE: "/recruitment/interviews",
                withId: (id: string | number) => `/recruitment/interviews/${id}`,
            },
        },
        ONBOARDING: {
            BASE: "/onboarding",
            withId: (id: string | number) => `/onboarding/${id}`,
            TASK: (workflowId: string | number, taskId: string | number) => `/onboarding/${workflowId}/tasks/${taskId}`,
            DOCUMENTS: (workflowId: string | number) => `/onboarding/${workflowId}/documents`,
        },
        CONTINGENT_WORKERS: {
            BASE: "/contingent-workers",
            withId: (id: string | number) => `/contingent-workers/${id}`,
            CONTRACTS: (workerId: string | number) => `/contingent-workers/${workerId}/contracts`,
        },
        QA_COMPLIANCE: {
            BASE: "/qa-compliance",
            withId: (id: string | number) => `/qa-compliance/${id}`,
            CAPA: (complianceId: string | number) => `/qa-compliance/${complianceId}/capa`,
        },
        WORKFORCE_SCHEDULING: {
            BASE: "/workforce-schedules",
            withId: (id: string | number) => `/workforce-schedules/${id}`,
            SHIFTS: (scheduleId: string | number) => `/workforce-schedules/${scheduleId}/shifts`,
            SHIFT: (scheduleId: string | number, shiftId: string | number) => `/workforce-schedules/${scheduleId}/shifts/${shiftId}`,
        },
        EMPLOYEE_RELATIONS: {
            BASE: "/employee-relations",
            withId: (id: string | number) => `/employee-relations/${id}`,
            DISCIPLINARY: (caseId: string | number) => `/employee-relations/${caseId}/disciplinary`,
        },
        TRAVEL: {
            REQUESTS: {
                BASE: "/travel-requests",
                STATUS: (id: string | number) => `/travel-requests/${id}/status`,
            },
            EXPENSES: {
                BASE: "/travel-expenses",
                STATUS: (id: string | number) => `/travel-expenses/${id}/status`,
            },
        },
        EMPLOYEE_LOANS: {
            BASE: "/employee-loans",
            withId: (id: string | number) => `/employee-loans/${id}`,
            STATUS: (id: string | number) => `/employee-loans/${id}/status`,
            REPAYMENT: (id: string | number, repaymentId: string | number) => `/employee-loans/${id}/repayments/${repaymentId}`,
        },
        PERFORMANCE: {
            GOALS: {
                BASE: "/performance/goals",
                withId: (id: string | number) => `/performance/goals/${id}`,
            },
            APPRAISALS: {
                BASE: "/performance/appraisals",
                withId: (id: string | number) => `/performance/appraisals/${id}`,
            },
            FEEDBACK: {
                BASE: "/performance/feedback",
            },
        },
        LEARNING: {
            COURSES: {
                BASE: "/learning/courses",
                withId: (id: string | number) => `/learning/courses/${id}`,
            },
            ENROLLMENTS: {
                BASE: "/learning/enrollments",
                withId: (id: string | number) => `/learning/enrollments/${id}`,
            },
        },
        COMMUNICATIONS: {
            ANNOUNCEMENTS: {
                BASE: "/communications/announcements",
                withId: (id: string | number) => `/communications/announcements/${id}`,
            },
            SURVEYS: {
                BASE: "/communications/surveys",
                RESPONSES: (surveyId: string | number) => `/communications/surveys/${surveyId}/responses`,
            },
        },
        EHS: {
            INCIDENTS: {
                BASE: "/ehs/incidents",
                withId: (id: string | number) => `/ehs/incidents/${id}`,
            },
            HEALTH_RECORDS: {
                BASE: "/ehs/health-records",
            },
            PPE: {
                BASE: "/ehs/ppe",
            },
        },
        WELLNESS: {
            PROGRAMS: {
                BASE: "/wellness/programs",
            },
            PARTICIPATIONS: {
                BASE: "/wellness/participations",
                withId: (id: string | number) => `/wellness/participations/${id}`,
            },
        },
        SUCCESSION: {
            BASE: "/succession",
            withId: (id: string | number) => `/succession/${id}`,
            CANDIDATES: (planId: string | number) => `/succession/${planId}/candidates`,
            CANDIDATE: (planId: string | number, candidateId: string | number) => `/succession/${planId}/candidates/${candidateId}`,
        },
        COMPENSATION: {
            PLANS: {
                BASE: "/compensation/plans",
                withId: (id: string | number) => `/compensation/plans/${id}`,
            },
            ENTRIES: {
                BASE: "/compensation/entries",
                STATUS: (id: string | number) => `/compensation/entries/${id}/status`,
            },
        },
        BENEFITS: {
            PLANS: {
                BASE: "/benefits/plans",
                withId: (id: string | number) => `/benefits/plans/${id}`,
            },
            ENROLLMENTS: {
                BASE: "/benefits/enrollments",
                withId: (id: string | number) => `/benefits/enrollments/${id}`,
            },
        },
        POST_PAYROLL: {
            BASE: "/post-payroll",
            PROCESS: (id: string | number) => `/post-payroll/${id}/process`,
            RECONCILE: (id: string | number) => `/post-payroll/${id}/reconcile`,
        },
        KNOWLEDGE: {
            BASE: "/knowledge-base",
            withId: (id: string | number) => `/knowledge-base/${id}`,
            HELPFUL: (id: string | number) => `/knowledge-base/${id}/helpful`,
        },
        EXPERTISE: {
            BASE: "/expertise",
            withId: (id: string | number) => `/expertise/${id}`,
        },
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
