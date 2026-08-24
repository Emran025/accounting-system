import { catalogMessage } from "@/lib/i18n";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Domain 2: Commercial Operations (العمليات التجارية والعملاء)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Vision: Complete commercial lifecycle management — from CRM and sales pipeline
 * through revenue recognition, marketing, and sales governance.
 * 
 * Cross-Domain Integration:
 *  - Finance: Revenue posting, receivables
 *  - Supply Chain: Stock reservations on sales orders
 *  - Intelligence: Sales analytics and forecasting
 */

import { Domain } from "../../types/navigation";

export const CommercialDomain: Domain = {
    id: "commercial",
    order: 2,
    title: catalogMessage("navigation.commercialConfig.businessOperationsCustomers"),
    icon: "cart",
    description: catalogMessage("navigation.commercialConfig.salesCustomerManagementCrmSalesCycleRevenue"),
    capabilities: [
        // ─────────────────────────────────────────────────────────────
        // Capability: Customer Relationship (CRM)
        // ─────────────────────────────────────────────────────────────
        {
            id: "crm",
            title: catalogMessage("navigation.commercialConfig.customerManagement"),
            icon: "user-plus",
            description: catalogMessage("navigation.commercialConfig.customerDatabaseClassificationsSelfServicePortal"),
            groups: [
                {
                    id: "customer-master",
                    title: catalogMessage("navigation.commercialConfig.customerData"),
                    description: catalogMessage("navigation.commercialConfig.customerMasterDataManagement"),
                    screens: [
                        {
                            id: "customers-list",
                            title: catalogMessage("common.general.customers"),
                            icon: "user-plus",
                            description: catalogMessage("navigation.commercialConfig.customerDatabase"),
                            href: "/02-commercial/crm/customer-master/customers-list",
                            permissions: [],
                            module: "ar_customers",
                        },
                        {
                            id: "customer-ledger",
                            title: catalogMessage("navigation.commercialConfig.customerBalances"),
                            icon: "hand-coins",
                            description: catalogMessage("common.general.accountsPayableBalances"),
                            href: "/02-commercial/crm/customer-master/customer-ledger",
                            permissions: [],
                            module: "ar_customers",
                        },
                    ],
                },
                {
                    id: "customer-groups-nr",
                    title: catalogMessage("navigation.commercialConfig.customerGroups"),
                    icon: "users",
                    description: catalogMessage("navigation.commercialConfig.customerNumberingSeriesRanges"),
                    screens: [
                        {
                            id: "add-customer-group",
                            title: catalogMessage("common.general.aggregationDefinition"),
                            icon: "add",
                            description: catalogMessage("common.general.addNewCollection"),
                            href: "/02-commercial/crm/customer-groups-nr/add-customer-group",
                            permissions: [],
                            module: "ar_customers",
                        },
                        {
                            id: "add-customer-nr",
                            title: catalogMessage("common.general.scopeDefinition"),
                            icon: "add",
                            description: catalogMessage("common.general.addNewRange"),
                            href: "/02-commercial/crm/customer-groups-nr/add-customer-nr",
                            permissions: [],
                            module: "ar_customers",
                        },
                        {
                            id: "view-customer-groups",
                            title: catalogMessage("common.general.viewCustomerAggregates"),
                            icon: "view",
                            description: catalogMessage("common.general.viewCustomerAggregates"),
                            href: "/02-commercial/crm/customer-groups-nr/view-customer-groups",
                            permissions: [],
                            module: "ar_customers",
                        },
                        {
                            id: "view-customer-nr",
                            title: catalogMessage("common.general.viewCustomerScopes"),
                            icon: "view",
                            description: catalogMessage("common.general.viewCustomerScopes"),
                            href: "/02-commercial/crm/customer-groups-nr/view-customer-nr",
                            permissions: [],
                            module: "ar_customers",
                        },
                        {
                            id: "customer-nr-assignment",
                            title: catalogMessage("common.general.viewAddAssignments"),
                            icon: "add",
                            description: catalogMessage("navigation.commercialConfig.showNumberRangeAssignmentsCustomers"),
                            href: "/02-commercial/crm/customer-groups-nr/customer-nr-assignment",
                            permissions: [],
                            module: "ar_customers",
                        },
                    ],
                },
            ],
        },

        // ─────────────────────────────────────────────────────────────
        // Capability: Sales Pipeline & Lifecycle
        // ─────────────────────────────────────────────────────────────
        {
            id: "sales-lifecycle",
            title: catalogMessage("navigation.commercialConfig.salesGoodsProducts"),
            icon: "cart",
            description: catalogMessage("navigation.commercialConfig.quotationsSalesOrdersInvoicesReturns"),
            groups: [
                {
                    id: "direct-sales",
                    title: catalogMessage("navigation.commercialConfig.directSales"),
                    description: catalogMessage("navigation.commercialConfig.directSalesInvoicesTransactionsManagement"),
                    screens: [
                        {
                            id: "sales-invoices",
                            title: catalogMessage("common.general.salesInvoices"),
                            icon: "cart",
                            description: catalogMessage("navigation.commercialConfig.createManageSalesInvoices"),
                            href: "/02-commercial/sales-lifecycle/direct-sales/sales-invoices",
                            permissions: [],
                            module: "sales",
                        },
                        {
                            id: "deferred-sales",
                            title: catalogMessage("navigation.commercialConfig.deferredSales"),
                            icon: "receipt",
                            description: catalogMessage("navigation.commercialConfig.installmentCreditSales"),
                            href: "/02-commercial/sales-lifecycle/direct-sales/deferred-sales",
                            permissions: [],
                            module: "deferred_sales",
                        },
                        {
                            id: "sales-returns",
                            title: catalogMessage("navigation.commercialConfig.salesReturns"),
                            icon: "history",
                            description: catalogMessage("navigation.commercialConfig.salesReturnsManagement"),
                            href: "/02-commercial/sales-lifecycle/direct-sales/sales-returns",
                            permissions: [],
                            module: "returns",
                        },
                        {
                            id: "commercial-reports",
                            title: catalogMessage("navigation.commercialConfig.tradeReports"),
                            icon: "eye",
                            description: catalogMessage("navigation.commercialConfig.salesCustomersReturnsExportReports"),
                            href: "/02-commercial/sales-lifecycle/direct-sales/reports",
                            permissions: [],
                            module: "sales",
                        },
                    ],
                },
                {
                    id: "sales-orders",
                    title: catalogMessage("common.general.internalTransactions"),
                    description: catalogMessage("navigation.commercialConfig.purchaseRequisitionsQuotationsSalesOrders"),
                    screens: [
                        {
                            id: "purchase-requests-sales",
                            title: catalogMessage("common.general.purchaseOrders"),
                            icon: "book-open",
                            description: catalogMessage("navigation.commercialConfig.managePurchaseStockTransferRequestsTheirStatus"),
                            href: "/02-commercial/sales-lifecycle/sales-orders/purchase-requests-sales",
                            permissions: [],
                            module: "ar_customers",
                        },
                        {
                            id: "quotations",
                            title: catalogMessage("common.general.quotes"),
                            icon: "cart",
                            description: catalogMessage("navigation.commercialConfig.createIssueQuotes"),
                            href: "/02-commercial/sales-lifecycle/sales-orders/quotations",
                            permissions: [],
                            module: "sales",
                        },
                        {
                            id: "sales-orders-list",
                            title: catalogMessage("navigation.commercialConfig.salesOrders"),
                            icon: "cart",
                            description: catalogMessage("navigation.commercialConfig.salesOrderManagementComingSoon"),
                            href: "/02-commercial/sales-lifecycle/sales-orders/sales-orders-list",
                            permissions: [],
                            module: "sales",
                            status: "pending",
                        },
                    ],
                },
            ],
        },

        // ─────────────────────────────────────────────────────────────
        // Capability: Revenue & Receivables
        // ─────────────────────────────────────────────────────────────
        {
            id: "revenue-receivables",
            title: catalogMessage("navigation.commercialConfig.revenueReceiptVouchers"),
            icon: "trending-up",
            description: catalogMessage("navigation.commercialConfig.revenueRecognitionReceiptVouchersDebtCollection"),
            groups: [
                {
                    id: "revenue-receipts",
                    title: catalogMessage("navigation.commercialConfig.revenueReceipts"),
                    description: catalogMessage("navigation.commercialConfig.recordRevenueReceiptVouchers"),
                    screens: [
                        {
                            id: "revenues",
                            title: catalogMessage("common.general.revenue"),
                            icon: "trending-up",
                            description: catalogMessage("navigation.commercialConfig.miscellaneousRevenuePosting"),
                            href: "/02-commercial/revenue-receivables/revenue-receipts/revenues",
                            permissions: [],
                            module: "revenues",
                        },
                        {
                            id: "receipt-vouchers",
                            title: catalogMessage("navigation.commercialConfig.receiptVouchers"),
                            icon: "book-open",
                            description: catalogMessage("navigation.commercialConfig.customerBalanceReceipts"),
                            href: "/02-commercial/revenue-receivables/revenue-receipts/receipt-vouchers",
                            permissions: [],
                            module: "ar_customers",
                        },
                    ],
                },
            ],
        },

        // ─────────────────────────────────────────────────────────────
        // Capability: Marketing & Distribution
        // ─────────────────────────────────────────────────────────────
        {
            id: "marketing-distribution",
            title: catalogMessage("navigation.commercialConfig.marketingPromoters"),
            icon: "award",
            description: catalogMessage("navigation.commercialConfig.agentsCommissionsPromotion"),
            groups: [
                {
                    id: "representatives",
                    title: catalogMessage("common.general.salesRepresentativesMarketers"),
                    description: catalogMessage("navigation.commercialConfig.marketingDistributionChannelManagement"),
                    screens: [
                        {
                            id: "reps-list",
                            title: catalogMessage("common.general.salesRepresentativesMarketers"),
                            icon: "tags",
                            description: catalogMessage("common.general.representativesMarketersManagement"),
                            href: "/02-commercial/marketing-distribution/representatives/reps-list",
                            permissions: [],
                            module: "representatives",
                        },
                        {
                            id: "reps-ledger",
                            title: catalogMessage("common.general.salesRepresentativesMarketers"),
                            icon: "tags",
                            description: catalogMessage("common.general.representativesMarketersManagement"),
                            href: "/02-commercial/marketing-distribution/representatives/reps-ledger",
                            permissions: [],
                            module: "representatives",
                        },
                        {
                            id: "commissions",
                            title: catalogMessage("navigation.commercialConfig.commissions"),
                            icon: "coins",
                            description: catalogMessage("navigation.commercialConfig.salesCommissionsComingSoon"),
                            href: "/02-commercial/marketing-distribution/representatives/commissions",
                            permissions: [],
                            module: "representatives",
                            status: "pending",
                        },
                    ],
                },
            ],
        },
        // ─────────────────────────────────────────────────────────────
        // Capability: Marketplace Catalog & Offers
        // ─────────────────────────────────────────────────────────────
        {
            id: "marketplace",
            title: catalogMessage("navigation.commercialConfig.marketplace"),
            icon: "box",
            description: catalogMessage("navigation.commercialConfig.marketplaceDescription"),
            groups: [
                {
                    id: "catalog-offers",
                    title: catalogMessage("navigation.commercialConfig.marketplaceOperations"),
                    description: catalogMessage("navigation.commercialConfig.marketplaceDescription"),
                    screens: [
                        {
                            id: "marketplace-dashboard",
                            title: catalogMessage("navigation.commercialConfig.marketplace"),
                            icon: "box",
                            description: catalogMessage("navigation.commercialConfig.marketplaceDescription"),
                            href: "/02-commercial/marketplace/catalog-offers/marketplace-dashboard",
                            permissions: [],
                            module: "marketplace",
                        },
                    ],
                },
            ],
        },

        // ─────────────────────────────────────────────────────────────
        // Capability: Managing and monitoring sales of in-stock 
        // and non-in-stock products (Instant Services)
        // ─────────────────────────────────────────────────────────────
        {
            id: "instant-services",
            title: catalogMessage("navigation.commercialConfig.readyUseServices"),
            icon: "briefcase",
            description: catalogMessage("navigation.commercialConfig.sellServicesCashCreditWithoutAffectingInventory"),
            groups: [

                {
                    id: "services-core",
                    title: catalogMessage("navigation.commercialConfig.serviceSales"),
                    description: catalogMessage("navigation.commercialConfig.serviceCatalogSalesTransactionsManagement"),
                    screens: [
                        {
                            id: "cash-services",
                            title: catalogMessage("navigation.commercialConfig.cashServicesSales"),
                            icon: "banknote",
                            description: catalogMessage("navigation.commercialConfig.cashServiceInvoiceRegistration"),
                            href: "/02-commercial/instant-services/services-core/cash-services",
                            permissions: [],
                            module: "sales",
                        },
                        {
                            id: "credit-services",
                            title: catalogMessage("navigation.commercialConfig.salesFutureServices"),
                            icon: "receipt",
                            description: catalogMessage("navigation.commercialConfig.recordDeferredServiceInvoicesClients"),
                            href: "/02-commercial/instant-services/services-core/credit-services",
                            permissions: [],
                            module: "sales",
                        },
                        {
                            id: "service-returns",
                            title: catalogMessage("navigation.commercialConfig.serviceReturns"),
                            icon: "history",
                            description: catalogMessage("navigation.commercialConfig.serviceSalesReturnsManagement"),
                            href: "/02-commercial/instant-services/services-core/service-returns",
                            permissions: [],
                            module: "returns",
                        },
                    ],
                },

                {
                    id: "instnt-srvcs-ctlg",
                    title: catalogMessage("navigation.commercialConfig.commercialServicesCatalog"),
                    description: catalogMessage("navigation.commercialConfig.defineAllSellableNonInventoryServices"),
                    screens: [
                        {
                            id: "services-management",
                            title: catalogMessage("common.general.serviceManagement"),
                            icon: "briefcase",
                            description: catalogMessage("navigation.commercialConfig.viewAddEditDeleteServices"),
                            href: "/02-commercial/instant-services/instnt-srvcs-ctlg/services-management",
                            permissions: [],
                            module: "sales",
                        },
                        {
                            id: "instnt-srvcs-categories",
                            title: catalogMessage("common.general.categories"),
                            icon: "tags",
                            description: catalogMessage("navigation.commercialConfig.serviceCategories"),
                            href: "/02-commercial/instant-services/instnt-srvcs-ctlg/instnt-srvcs-categories",
                            permissions: [],
                            module: "dashboard",
                        },
                    ]
                }
            ],
        },

        // ─────────────────────────────────────────────────────────────
        // Capability: Sales Governance
        // ─────────────────────────────────────────────────────────────
        {
            id: "sales-governance",
            title: catalogMessage("navigation.commercialConfig.salesGovernance"),
            icon: "coins",
            description: catalogMessage("navigation.commercialConfig.documentTemplatesNumberingRanges"),
            groups: [
                {
                    id: "templates",
                    title: catalogMessage("common.general.templateManagement"),
                    description: catalogMessage("navigation.commercialConfig.designInvoiceTemplates"),
                    screens: [
                        {
                            id: "template-manager",
                            title: catalogMessage("common.general.templateManagement"),
                            icon: "coins",
                            description: catalogMessage("navigation.commercialConfig.manageDesignTemplatesInvoicesAccountStatements"),
                            href: "/02-commercial/sales-governance/templates/template-manager",
                            permissions: [],
                            module: "system_templates",
                        },
                    ],
                },
            ],
        },
    ],
};
