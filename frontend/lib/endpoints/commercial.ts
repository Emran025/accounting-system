export interface CommercialEndpoints {
    SALES: {
        INVOICES: string;
        INVOICE_BY_ID: (id: string | number) => string;
        INVOICE_DETAILS: string;
        QUOTATIONS: {
            BASE: string;
            withId: (id: string | number) => string;
            STATUS: (id: string | number) => string;
        };
        RETURNS: {
            BASE: string;
            SHOW: string;
            LEDGER: string;
        };
        ZATCA: {
            SUBMIT: (id: string | number) => string;
            STATUS: (id: string | number) => string;
        };
        REPRESENTATIVES: {
            BASE: string;
            LEDGER: string;
            TRANSACTIONS: string;
        };
        TEMPLATES: {
            BASE: string;
            withId: (id: string | number) => string;
            byKey: (key: string) => string;
            byType: (type: string) => string;
            HISTORY: (id: string | number) => string;
            RENDER: (id: string | number) => string;
            APPROVED_KEYS: string;
        };
    };
    SERVICES: {
        BASE: string;
        SALES: string;
        INVOICE_DETAILS: string;
        RETURNS: {
            BASE: string;
            SHOW: string;
            LEDGER: string;
        };
    };
    PROCUREMENT: {
        BASE: string;
        REQUESTS: string;
        APPROVE: string;
        SUPPLIERS: {
            BASE: string;
            TRANSACTIONS: string;
            PAYMENT: string;
            LEDGER: string;
        };
        RETURNS: {
            BASE: string;
            SHOW: string;
            LEDGER: string;
        };
    };
    CRM: {
        CUSTOMERS: string;
        CUSTOMER_LEDGER: string;
        CUSTOMER_TRANSACTIONS: string;
        CUSTOMER_RECEIPTS: string;
    };
    MARKETPLACE: {
        MERCHANTS: { BASE: string; verify: (id: string) => string };
        PUBLICATIONS: { BASE: string; publish: (id: string) => string; withdraw: (id: string) => string };
        OFFERS: { BASE: string; publish: (id: string) => string; withdraw: (id: string) => string };
        INQUIRIES: { BASE: string; byId: (id: string) => string; assign: (id: string) => string; qualify: (id: string) => string; lost: (id: string) => string; convert: (id: string) => string };
        ANALYTICS: { OVERVIEW: string };
        OUTBOX: { BASE: string; dispatch: string };
    };
}

export const COMMERCIAL: CommercialEndpoints = {
    SALES: {
        INVOICES: "/v2/sales/invoices",
        INVOICE_BY_ID: (id: string | number) => `/v2/sales/invoices/${id}`,
        INVOICE_DETAILS: "/v2/sales/invoice_details",
        QUOTATIONS: {
            BASE: "/v2/sales/quotations",
            withId: (id: string | number) => `/v2/sales/quotations/${id}`,
            STATUS: (id: string | number) => `/v2/sales/quotations/${id}/status`,
        },
        RETURNS: {
            BASE: "/v2/sales/returns",
            SHOW: "/v2/sales/returns/show",
            LEDGER: "/v2/sales/returns/ledger",
        },
        ZATCA: {
            SUBMIT: (id: string | number) => `/v2/zatca/invoices/${id}/submit`,
            STATUS: (id: string | number) => `/v2/zatca/invoices/${id}/status`,
        },
        REPRESENTATIVES: {
            BASE: "/v2/commercial/representatives",
            LEDGER: "/v2/commercial/representatives/ledger",
            TRANSACTIONS: "/v2/commercial/representatives/transactions",
        },
        TEMPLATES: {
            BASE: "/v2/system-templates",
            withId: (id: string | number) => `/v2/system-templates/${id}`,
            byKey: (key: string) => `/v2/system-templates/key/${key}`,
            byType: (type: string) => `/v2/system-templates/type/${type}`,
            HISTORY: (id: string | number) => `/v2/system-templates/${id}/history`,
            RENDER: (id: string | number) => `/v2/system-templates/${id}/render`,
            APPROVED_KEYS: "/v2/system-templates/approved-keys",
        },
    },
    SERVICES: {
        BASE: "/v2/services",
        SALES: "/v2/services/sales",
        INVOICE_DETAILS: "/v2/services/sales/details",
        RETURNS: {
            BASE: "/v2/services/returns",
            SHOW: "/v2/services/returns/show",
            LEDGER: "/v2/services/returns/ledger",
        },
    },
    PROCUREMENT: {
        BASE: "/v2/purchases",
        REQUESTS: "/v2/requests",
        APPROVE: "/v2/purchases/approve",
        SUPPLIERS: {
            BASE: "/v2/ap/suppliers",
            TRANSACTIONS: "/v2/ap/transactions",
            PAYMENT: "/v2/ap/payment",
            LEDGER: "/v2/ap/ledger",
        },
        RETURNS: {
            BASE: "/v2/purchases",
            SHOW: "/v2/purchases/show",
            LEDGER: "/v2/purchases/returns/ledger",
        },
    },
    CRM: {
        CUSTOMERS: "/v2/crm/customers",
        CUSTOMER_LEDGER: "/v2/crm/ledger",
        CUSTOMER_TRANSACTIONS: "/v2/crm/transactions",
        CUSTOMER_RECEIPTS: "/v2/crm/receipts",
    },
    MARKETPLACE: {
        MERCHANTS: { BASE: "/v2/marketplace/merchants", verify: (id: string) => `/v2/marketplace/merchants/${id}/verify` },
        PUBLICATIONS: { BASE: "/v2/marketplace/publications", publish: (id: string) => `/v2/marketplace/publications/${id}/publish`, withdraw: (id: string) => `/v2/marketplace/publications/${id}/withdraw` },
        OFFERS: { BASE: "/v2/marketplace/offers", publish: (id: string) => `/v2/marketplace/offers/${id}/publish`, withdraw: (id: string) => `/v2/marketplace/offers/${id}/withdraw` },
        INQUIRIES: {
            BASE: "/v2/marketplace/inquiries",
            byId: (id: string) => `/v2/marketplace/inquiries/${id}`,
            assign: (id: string) => `/v2/marketplace/inquiries/${id}/assign`,
            qualify: (id: string) => `/v2/marketplace/inquiries/${id}/qualify`,
            lost: (id: string) => `/v2/marketplace/inquiries/${id}/lost`,
            convert: (id: string) => `/v2/marketplace/inquiries/${id}/convert`,
        },
        ANALYTICS: { OVERVIEW: "/v2/marketplace/analytics/overview" },
        OUTBOX: { BASE: "/v2/marketplace/outbox", dispatch: "/v2/marketplace/outbox/dispatch" },
    },
};
