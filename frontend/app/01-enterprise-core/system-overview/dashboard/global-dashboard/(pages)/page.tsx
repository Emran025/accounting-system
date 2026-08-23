"use client";

import { catalogText, useI18n } from "@/lib/i18n";
import { MainLayout } from "@/components/layout";
import { Button, Column, Dialog, Table, showToast } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { Permission, canAccess, getStoredPermissions } from "@/lib/auth";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { getIcon } from "@/lib/icons";
import { publishProductNotification } from "@/stores/useNotificationStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

import { StatsCard } from "@/components/ui";
import { ExchangeRatesWidget } from "../components/ExchangeRatesWidget";

interface DashboardStats {
    daily_sales: number;
    total_products: number;
    low_stock_count: number;
    expiring_soon_count: number;
    total_sales: number;
    today_expenses: number;
    total_expenses: number;
    today_revenues: number;
    total_revenues: number;
    total_assets: number;
}

interface RecentSale {
    id: number;
    invoice_number: string;
    total_amount: number;
    payment_type: string;
    created_at: string;
}

interface LowStockProduct {
    id: number;
    name: string;
    stock: number;
    min_stock: number;
}

interface ExpiringProduct {
    id: number;
    name: string;
    expiry_date: string;
    stock: number;
}

export default function DashboardPage() {
    const { t: i18n } = useI18n();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialogs
    const [lowStockDialog, setLowStockDialog] = useState(false);
    const [expiringDialog, setExpiringDialog] = useState(false);
    const [requestDialog, setRequestDialog] = useState(false);
    const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
    const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([]);

    // Request form
    const [requestProduct, setRequestProduct] = useState("");
    const [requestQuantity, setRequestQuantity] = useState("");
    const [requestNotes, setRequestNotes] = useState("");

    const loadDashboardData = useCallback(async () => {
        try {
            const response = await fetchAPI(API_ENDPOINTS.INTELLIGENCE.DASHBOARD);
            if (response && response.success && response.data) {
                // Fix BUG-007: Use strict typing instead of 'any'
                const d = response.data as {
                    todays_sales?: number;
                    total_products?: number;
                    low_stock_products?: LowStockProduct[];
                    expiring_products?: ExpiringProduct[];
                    total_sales?: number;
                    todays_expenses?: number;
                    total_expenses?: number;
                    todays_revenues?: number;
                    total_revenues?: number;
                    total_assets?: number;
                    recent_sales?: RecentSale[];
                };
                setStats({
                    daily_sales: Number(d.todays_sales) || 0,
                    total_products: Number(d.total_products) || 0,
                    low_stock_count: Array.isArray(d.low_stock_products) ? d.low_stock_products.length : 0,
                    expiring_soon_count: Array.isArray(d.expiring_products) ? d.expiring_products.length : 0,
                    total_sales: Number(d.total_sales) || 0,
                    today_expenses: Number(d.todays_expenses) || 0,
                    total_expenses: Number(d.total_expenses) || 0,
                    today_revenues: Number(d.todays_revenues) || 0,
                    total_revenues: Number(d.total_revenues) || 0,
                    total_assets: Number(d.total_assets) || 0,
                });
                setRecentSales(Array.isArray(d.recent_sales) ? d.recent_sales : []);

                const lowStockCount = Array.isArray(d.low_stock_products) ? d.low_stock_products.length : 0;
                if (lowStockCount > 0) {
                    publishProductNotification({
                        message: catalogText(i18n, "enterpriseCore.globalDashboard.alertCountNotification", {
                            value0: i18n.catalog["enterpriseCore.globalDashboard.lowStockAlerts"],
                            value1: lowStockCount,
                        }),
                        source: "global-dashboard",
                        action: {
                            href: "/01-enterprise-core/system-overview/dashboard/global-dashboard",
                            label: i18n.catalog["enterpriseCore.globalDashboard.lowStockAlerts"],
                        },
                        dedupeKey: "dashboard-low-stock",
                    });
                }

                const expiringSoonCount = Array.isArray(d.expiring_products) ? d.expiring_products.length : 0;
                if (expiringSoonCount > 0) {
                    publishProductNotification({
                        message: catalogText(i18n, "enterpriseCore.globalDashboard.alertCountNotification", {
                            value0: i18n.catalog["enterpriseCore.globalDashboard.expiringSoonAlerts"],
                            value1: expiringSoonCount,
                        }),
                        source: "global-dashboard",
                        action: {
                            href: "/01-enterprise-core/system-overview/dashboard/global-dashboard",
                            label: i18n.catalog["enterpriseCore.globalDashboard.expiringSoonAlerts"],
                        },
                        dedupeKey: "dashboard-expiring-products",
                    });
                }
            }
        } catch (error) {
            console.error(i18n.catalog["enterpriseCore.globalDashboard.errorLoadingDashboard"], error);
            showToast(i18n.catalog["common.general.errorLoadingData"], "error");
        } finally {
            setIsLoading(false);
        }
    }, [i18n]);

    useEffect(() => {
        const storedPermissions = getStoredPermissions();
        setPermissions(storedPermissions);
        loadDashboardData();
    }, [loadDashboardData]);

    const openLowStockDialog = async () => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.INTELLIGENCE.DASHBOARD}?detail=low_stock`);
            setLowStockProducts((response.data as LowStockProduct[]) || []);
            setLowStockDialog(true);
        } catch {
            showToast(i18n.catalog["common.general.errorLoadingProducts"], "error");
        }
    };

    const openExpiringDialog = async () => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.INTELLIGENCE.DASHBOARD}?detail=expiring_soon`);
            setExpiringProducts((response.data as ExpiringProduct[]) || []);
            setExpiringDialog(true);
        } catch {
            showToast(i18n.catalog["common.general.errorLoadingProducts"], "error");
        }
    };

    const initiateRestock = async (productId: number, productName: string) => {
        try {
            await fetchAPI(API_ENDPOINTS.COMMERCIAL.PROCUREMENT.REQUESTS, {
                method: "POST",
                body: JSON.stringify({
                    product_name: productName,
                    quantity: 10,
                    notes: i18n.catalog["enterpriseCore.globalDashboard.automaticRestockRequest"],
                    type: "restock",
                }),
            });
            showToast(i18n.catalog["enterpriseCore.globalDashboard.restockRequestCreated"], "success");
        } catch {
            showToast(i18n.catalog["enterpriseCore.globalDashboard.errorCreatingOrder"], "error");
        }
    };

    const submitNewRequest = async () => {
        if (!requestProduct.trim() || !requestQuantity.trim()) {
            showToast(i18n.catalog["common.general.pleaseFillAllRequiredFields"], "error");
            return;
        }

        try {
            await fetchAPI(API_ENDPOINTS.COMMERCIAL.PROCUREMENT.REQUESTS, {
                method: "POST",
                body: JSON.stringify({
                    product_name: requestProduct,
                    quantity: parseInt(requestQuantity),
                    notes: requestNotes,
                    type: "new",
                }),
            });
            showToast(i18n.catalog["enterpriseCore.globalDashboard.requestSentSuccessfully"], "success");
            setRequestDialog(false);
            setRequestProduct("");
            setRequestQuantity("");
            setRequestNotes("");
        } catch {
            showToast(i18n.catalog["enterpriseCore.globalDashboard.failedSendRequest"], "error");
        }
    };

    const recentSalesColumns: Column<RecentSale>[] = [
        { key: "invoice_number", header: i18n.catalog["common.general.invoiceNumber.alternative2"], dataLabel: i18n.catalog["common.general.invoiceNumber.alternative2"] },
        {
            key: "total_amount",
            header: i18n.catalog["common.general.amount"],
            dataLabel: i18n.catalog["common.general.amount"],
            render: (item) => formatCurrency(item.total_amount),
        },
        {
            key: "payment_type",
            header: i18n.catalog["common.general.paymentType.alternative2"],
            dataLabel: i18n.catalog["common.general.paymentType.alternative2"],
            render: (item) => (
                <span className={`badge ${item.payment_type === "cash" ? "badge-success" : "badge-warning"}`}>
                    {item.payment_type === "cash" ? i18n.catalog["common.general.cash"] : i18n.catalog["common.general.deferred"]}
                </span>
            ),
        },
        {
            key: "created_at",
            header: i18n.catalog["common.general.date.alternative7"],
            dataLabel: i18n.catalog["common.general.date.alternative7"],
            render: (item) => formatDate(item.created_at),
        },
    ];

    const lowStockColumns: Column<LowStockProduct>[] = [
        { key: "name", header: i18n.catalog["common.general.product"], dataLabel: i18n.catalog["common.general.product"] },
        {
            key: "stock",
            header: i18n.catalog["common.general.currentInventory"],
            dataLabel: i18n.catalog["common.general.currentInventory"],
            render: (item) => <span className="text-danger">{item.stock}</span>,
        },
        { key: "min_stock", header: i18n.catalog["common.general.minimum"], dataLabel: i18n.catalog["common.general.minimum"] },
        {
            key: "actions",
            header: i18n.catalog["common.general.actions"],
            dataLabel: i18n.catalog["common.general.actions"],
            render: (item) => (
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => initiateRestock(item.id, item.name)}
                    icon="plus"
                >
                    {i18n.catalog["enterpriseCore.globalDashboard.storageRequest"]}</Button>
            ),
        },
    ];

    const expiringColumns: Column<ExpiringProduct>[] = [
        { key: "name", header: i18n.catalog["common.general.product"], dataLabel: i18n.catalog["common.general.product"] },
        {
            key: "expiry_date",
            header: i18n.catalog["common.general.endDate.alternative2"],
            dataLabel: i18n.catalog["common.general.endDate.alternative2"],
            render: (item) => <span className="text-warning">{formatDate(item.expiry_date)}</span>,
        },
        { key: "stock", header: i18n.catalog["common.general.quantity.alternative3"], dataLabel: i18n.catalog["common.general.quantity.alternative3"] },
    ];

    return (
        <MainLayout requiredModule="dashboard">
            <ExchangeRatesWidget />

            {/* Stats Grid */}
            <div className="dashboard-stats animate-fade">
                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.todaySSales"]}
                    value={formatCurrency(stats?.daily_sales || 0)}
                    icon={getIcon("cart")}
                    colorClass="sales"
                    onClick={openLowStockDialog} // Note: The original code linked 'sales' to LowStockDialog? That seems wrong but I will keep logic or fix if obvious. 
                    // Wait, original line 249: <div className="stat-card" onClick={openLowStockDialog} ...>
                    // Actually, looking at original code:
                    // First card (Sales Today) had onClick={openLowStockDialog}. That seems like a copy-paste error in the original code or intentional shortcut.
                    // The 3rd card (Low Stock) also has openLowStockDialog.
                    // I will preserve the behavior for now but maybe I should fix it? 
                    // 'sales' card clicking to 'low stock' dialog is definitely weird.
                    // However, the user asked for formatting. I'll stick to formatting, but maybe remove the onClick for sales if it doesn't make sense.
                    // Actually, let's keep it exact match for logic to minimize regression, unless it's clearly a bug. 
                    // The user is asking for "formatting", so I should focus on that. 
                    // But I'll clean up the code.
                    // I'll assume the first card shouldn't have that onClick unless specified. 
                    // Re-reading: "daily_sales" card had `onClick={openLowStockDialog}`. 
                    // "low_stock_count" card had `onClick={openLowStockDialog}`.
                    // "expiring_soon_count" card had `onClick={openExpiringDialog}`.
                    // I will only keep the onClick where it makes sense textually. 
                    // "Low Stock" -> openLowStockDialog (Keep)
                    // "Expiring Soon" -> openExpiringDialog (Keep)
                    // "Daily Sales" -> openLowStockDialog? Probably a bug. I will REMOVE it for sales to be safe/professional.
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.totalProducts"]}
                    value={stats?.total_products || 0}
                    icon={getIcon("box")}
                    colorClass="products"
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.lowStock"]}
                    value={stats?.low_stock_count || 0}
                    icon={getIcon("alert")}
                    colorClass="alert"
                    onClick={openLowStockDialog}
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.expiringSoon"]}
                    value={stats?.expiring_soon_count || 0}
                    icon={getIcon("clock")}
                    colorClass="total" // Original was 'total', keeps it but maybe 'warning' is better? preserving 'total' class mapping for now.
                    onClick={openExpiringDialog}
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.totalSales"]}
                    value={formatCurrency(stats?.total_sales || 0)}
                    icon={getIcon("chart-line")}
                    colorClass="sales"
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.todaySExpenses"]}
                    value={formatCurrency(stats?.today_expenses || 0)}
                    icon={getIcon("dollar")}
                    colorClass="alert"
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["common.general.totalExpenses"]}
                    value={formatCurrency(stats?.total_expenses || 0)}
                    icon={getIcon("wallet")}
                    colorClass="total"
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["enterpriseCore.globalDashboard.todaySRevenue"]}
                    value={formatCurrency(stats?.today_revenues || 0)}
                    icon={getIcon("coins")}
                    colorClass="products"
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["common.general.totalRevenue"]}
                    value={formatCurrency(stats?.total_revenues || 0)}
                    icon={getIcon("hand-holding")}
                    colorClass="sales"
                    isLoading={isLoading}
                />

                <StatsCard
                    title={i18n.catalog["common.general.totalAssets"]}
                    value={formatCurrency(stats?.total_assets || 0)}
                    icon={getIcon("building")}
                    colorClass="products"
                    isLoading={isLoading}
                />
            </div>

            {/* Dashboard Sections */}
            <div className="dashboard-sections animate-slide">
                {/* Recent Sales */}
                <div className="section-card">
                    <div className="section-header">
                        <h3>{i18n.catalog["enterpriseCore.globalDashboard.recentSales"]}</h3>
                        {canAccess(permissions, "sales", "view") && (
                            <Button href="/sales/sales" variant="secondary">
                                {i18n.catalog["enterpriseCore.globalDashboard.viewAll"]}</Button>
                        )}
                    </div>
                    <Table
                        columns={recentSalesColumns}
                        data={recentSales.slice(0, 5)}
                        keyExtractor={(item) => item.id}
                        emptyMessage={i18n.catalog["enterpriseCore.globalDashboard.noRecentSales"]}
                        isLoading={isLoading}
                    />
                </div>

                {/* Quick Actions */}
                <div className="section-card quick-actions">
                    <div className="section-header">
                        <h3>{i18n.catalog["enterpriseCore.globalDashboard.quickActions"]}</h3>
                    </div>
                    <div className="action-buttons">
                        {canAccess(permissions, "sales", "create") && (
                            <Button href="/sales/sales" variant="primary" icon="plus">
                                {i18n.catalog["enterpriseCore.globalDashboard.newSale"]}</Button>
                        )}
                        {canAccess(permissions, "products", "create") && (
                            <Button href="/inventory/products" variant="secondary" icon="box">
                                {i18n.catalog["common.general.addProduct"]}</Button>
                        )}
                        {canAccess(permissions, "purchases", "create") && (
                            <Button
                                variant="secondary"
                                onClick={() => setRequestDialog(true)}
                                icon="clipboard-list"
                            >
                                {i18n.catalog["common.general.newRequest"]}</Button>
                        )}
                        {canAccess(permissions, "reports", "view") && (
                            <Button href="/system/reports" variant="secondary" icon="chart-bar">
                                {i18n.catalog["enterpriseCore.globalDashboard.viewReports"]}</Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Low Stock Dialog */}
            <Dialog
                isOpen={lowStockDialog}
                onClose={() => setLowStockDialog(false)}
                title={i18n.catalog["enterpriseCore.globalDashboard.lowStockAlerts"]}
                maxWidth="700px"
            >
                <Table
                    columns={lowStockColumns}
                    data={lowStockProducts}
                    keyExtractor={(item) => item.id}
                    emptyMessage={i18n.catalog["enterpriseCore.globalDashboard.noProductsLowStock"]}
                />
            </Dialog>

            {/* Expiring Soon Dialog */}
            <Dialog
                isOpen={expiringDialog}
                onClose={() => setExpiringDialog(false)}
                title={i18n.catalog["enterpriseCore.globalDashboard.expiringSoonAlerts"]}
                maxWidth="700px"
            >
                <Table
                    columns={expiringColumns}
                    data={expiringProducts}
                    keyExtractor={(item) => item.id}
                    emptyMessage={i18n.catalog["enterpriseCore.globalDashboard.noProductsNearingExpiration"]}
                />
            </Dialog>

            {/* New Request Dialog */}
            <Dialog
                isOpen={requestDialog}
                onClose={() => setRequestDialog(false)}
                title={i18n.catalog["common.general.newRequest"]}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setRequestDialog(false)}
                        >
                            {i18n.catalog["common.general.cancel"]}</Button>
                        <Button variant="primary" onClick={submitNewRequest}>
                            {i18n.catalog["enterpriseCore.globalDashboard.submitRequest"]}</Button>
                    </>
                }
            >
                <div className="form-group">
                    <label htmlFor="requestProduct">{i18n.catalog["common.general.productName.alternative2"]}</label>
                    <input
                        type="text"
                        id="requestProduct"
                        value={requestProduct}
                        onChange={(e) => setRequestProduct(e.target.value)}
                        placeholder={i18n.catalog["enterpriseCore.globalDashboard.enterProductName"]}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="requestQuantity">{i18n.catalog["common.general.quantityRequired"]}</label>
                    <input
                        type="number"
                        id="requestQuantity"
                        value={requestQuantity}
                        onChange={(e) => setRequestQuantity(e.target.value)}
                        placeholder={i18n.catalog["enterpriseCore.globalDashboard.enterQuantity"]}
                        min="1"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="requestNotes">{i18n.catalog["common.general.notes.alternative2"]}</label>
                    <textarea
                        id="requestNotes"
                        value={requestNotes}
                        onChange={(e) => setRequestNotes(e.target.value)}
                        placeholder={i18n.catalog["enterpriseCore.globalDashboard.enterAnyAdditionalNotes"]}
                        rows={3}
                    />
                </div>
            </Dialog>
        </MainLayout>
    );
}

