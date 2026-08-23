export interface EnterpriseCoreEndpoints {
    SETTINGS: {
        INDEX: string;
        STORE: string;
        INVOICE: string;
        ZATCA: string;
    };
    IAM: {
        USERS: {
            BASE: string;
            CHANGE_PASSWORD: string;
            MANAGERS: string;
            MANAGERS_ALT: string;
            ROLES: string;
            ROLES_WITH_ID: (id: string | number) => string;
            MY_SESSIONS: string;
            SESSIONS: string;
            SESSIONS_WITH_ID: (id: string | number) => string;
        };
        PERMISSION_TEMPLATES: {
            BASE: string;
            withId: (id: string | number) => string;
            APPLY: string;
        };
    };
    ORG: {
        META_TYPES: string;
        TOPOLOGY_RULES: string;
        FACTORY_CALENDARS: string;
        NODES: string;
        NODE: (uuid: string) => string;
        LINKS: string;
        LINK: (id: number) => string;
        SCOPE_CONTEXT: (uuid: string) => string;
        STATISTICS: string;
        INTEGRITY_CHECK: string;
        MODULE_READINESS: string;
        CHANGE_HISTORY: string;
        BULK_STATUS: string;
    };
    SETUP: {
        STATE: string;
        ORGANIZATION_TEMPLATES: string;
        ORGANIZATION_PROFILE: string;
        APPLY_ORGANIZATION_TEMPLATE: string;
        MODULES: string;
        ACTIVATE_SELECTED: string;
    };
    OPERATING_CONTEXT: {
        READINESS: string;
        CONFIGURE: string;
        WAREHOUSES: string;
        POS_TERMINALS: string;
        SELECT: (id: string | number) => string;
    };
    ORG_INTEGRATION: {
        STATUS: string;
        ISSUES: string;
        SYNC_COST_CENTER: (id: string | number) => string;
        SYNC_PROFIT_CENTER: (id: string | number) => string;
        SYNC_NODE: (uuid: string) => string;
        SYNC_JOB_TITLE: (id: string | number) => string;
        JOB_TITLE_MAPPING: (id: string | number) => string;
        OPEN_CENTER: string;
        CLOSE_CENTER: string;
        BULK_SYNC: {
            COST_CENTERS: string;
            PROFIT_CENTERS: string;
            NODES_TO_TABLES: string;
            JOB_TITLES: string;
        };
    };
    AUDIT: {
        LOGS: string;
        TRAIL: string;
    };
    COMPLIANCE_PROFILES: {
        BASE: string;
        withId: (id: string | number) => string;
        SYSTEM_KEYS: string;
        GENERATE_TOKEN: (id: string | number) => string;
        REVOKE_TOKEN: (id: string | number) => string;
        VALIDATE_STRUCTURE: string;
    };
    BATCH: string;
}

export const ENTERPRISE_CORE: EnterpriseCoreEndpoints = {
    SETTINGS: {
        INDEX: "/v2/settings",
        STORE: "/v2/settings/store",
        INVOICE: "/v2/settings/invoice",
        ZATCA: "/v2/settings/zatca",
    },
    IAM: {
        USERS: {
            BASE: "/v2/users",
            CHANGE_PASSWORD: "/v2/change_password",
            MANAGERS: "/v2/manager_list",
            MANAGERS_ALT: "/v2/users/managers",
            ROLES: "/v2/roles",
            ROLES_WITH_ID: (id: string | number) => `/v2/roles/${id}`,
            MY_SESSIONS: "/v2/my_sessions",
            SESSIONS: "/v2/sessions",
            SESSIONS_WITH_ID: (id: string | number) => `/v2/sessions/${id}`,
        },
        PERMISSION_TEMPLATES: {
            BASE: "/v2/permission-templates",
            withId: (id: string | number) => `/v2/permission-templates/${id}`,
            APPLY: "/v2/permission-templates/apply",
        },
    },
    ORG: {
        META_TYPES: "/v2/org-structure/meta-types",
        TOPOLOGY_RULES: "/v2/org-structure/topology-rules",
        FACTORY_CALENDARS: "/v2/org-structure/factory-calendars",
        NODES: "/v2/org-structure/nodes",
        NODE: (uuid: string) => `/v2/org-structure/nodes/${uuid}`,
        LINKS: "/v2/org-structure/links",
        LINK: (id: number) => `/v2/org-structure/links/${id}`,
        SCOPE_CONTEXT: (uuid: string) => `/v2/org-structure/scope-context/${uuid}`,
        STATISTICS: "/v2/org-structure/statistics",
        INTEGRITY_CHECK: "/v2/org-structure/integrity-check",
        MODULE_READINESS: "/v2/org-structure/module-readiness",
        CHANGE_HISTORY: "/v2/org-structure/change-history",
        BULK_STATUS: "/v2/org-structure/bulk-status-update",
    },
    SETUP: {
        STATE: "/v2/setup/state",
        ORGANIZATION_TEMPLATES: "/v2/setup/organization-templates",
        ORGANIZATION_PROFILE: "/v2/setup/organization-profile",
        APPLY_ORGANIZATION_TEMPLATE: "/v2/setup/apply-organization-template",
        MODULES: "/v2/setup/modules",
        ACTIVATE_SELECTED: "/v2/setup/activate-selected",
    },
    OPERATING_CONTEXT: {
        READINESS: "/v2/operating-context/readiness",
        CONFIGURE: "/v2/operating-context/configure",
        WAREHOUSES: "/v2/operating-context/warehouses",
        POS_TERMINALS: "/v2/operating-context/pos-terminals",
        SELECT: (id: string | number) => `/v2/operating-context/${id}/select`,
    },
    ORG_INTEGRATION: {
        STATUS: "/v2/org-integration/status",
        ISSUES: "/v2/org-integration/issues",
        SYNC_COST_CENTER: (id: string | number) => `/v2/org-integration/sync/cost-center/${id}`,
        SYNC_PROFIT_CENTER: (id: string | number) => `/v2/org-integration/sync/profit-center/${id}`,
        SYNC_NODE: (uuid: string) => `/v2/org-integration/sync/node/${uuid}`,
        SYNC_JOB_TITLE: (id: string | number) => `/v2/org-integration/sync/job-title/${id}`,
        JOB_TITLE_MAPPING: (id: string | number) => `/v2/org-integration/job-titles/${id}/mapping`,
        OPEN_CENTER: "/v2/org-integration/open-center",
        CLOSE_CENTER: "/v2/org-integration/close-center",
        BULK_SYNC: {
            COST_CENTERS: "/v2/org-integration/bulk-sync/cost-centers",
            PROFIT_CENTERS: "/v2/org-integration/bulk-sync/profit-centers",
            NODES_TO_TABLES: "/v2/org-integration/bulk-sync/nodes-to-tables",
            JOB_TITLES: "/v2/org-integration/bulk-sync/job-titles",
        },
    },
    AUDIT: {
        LOGS: "/v2/audit-logs",
        TRAIL: "/v2/audit-trail",
    },
    COMPLIANCE_PROFILES: {
        BASE: "/v2/platform/compliance/profiles",
        withId: (id: string | number) => `/v2/platform/compliance/profiles/${id}`,
        SYSTEM_KEYS: "/v2/platform/compliance/keys",
        GENERATE_TOKEN: (id: string | number) => `/v2/platform/compliance/profiles/${id}/token`,
        REVOKE_TOKEN: (id: string | number) => `/v2/platform/compliance/profiles/${id}/revoke-token`,
        VALIDATE_STRUCTURE: "/v2/platform/compliance/validate-structure",
    },
    BATCH: "/v2/batch",
};
