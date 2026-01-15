"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, showToast, Column, Button } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, Permission, getStoredUser, getStoredPermissions, canAccess } from "@/lib/auth";
import { getIcon } from "@/lib/icons";

import { ExchangeRatesWidget } from "./components/ExchangeRatesWidget";

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
    const [user, setUser] = useState<User | null>(null);
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
            const response = await fetchAPI("/api/dashboard");
            if (response && response.success && response.data) {
                // Fix BUG-007: Use strict typing instead of 'any'
                const d = response.data as {
                    todays_sales?: number;
                    total_products?: number;
                    low_stock_products?: any[];
                    expiring_products?: any[];
                    total_sales?: number;
                    todays_expenses?: number;
                    total_expenses?: number;
                    todays_revenues?: number;
                    total_revenues?: number;
                    total_assets?: number;
                    recent_sales?: any[];
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
            }
        } catch (error) {
            console.error("Error loading dashboard:", error);
            showToast("خطأ في تحميل البيانات", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const storedUser = getStoredUser();
        const storedPermissions = getStoredPermissions();
        setUser(storedUser);
        setPermissions(storedPermissions);
        loadDashboardData();
    }, [loadDashboardData]);

    const openLowStockDialog = async () => {
        try {
            const response = await fetchAPI("/api/dashboard?detail=low_stock");
            setLowStockProducts((response.data as LowStockProduct[]) || []);
            setLowStockDialog(true);
        } catch {
            showToast("خطأ في تحميل المنتجات", "error");
        }
    };

    const openExpiringDialog = async () => {
        try {
            const response = await fetchAPI("/api/dashboard?detail=expiring_soon");
            setExpiringProducts((response.data as ExpiringProduct[]) || []);
            setExpiringDialog(true);
        } catch {
            showToast("خطأ في تحميل المنتجات", "error");
        }
    };

    const initiateRestock = async (productId: number, productName: string) => {
        try {
            await fetchAPI("/api/requests", {
                method: "POST",
                body: JSON.stringify({
                    product_name: productName,
                    quantity: 10,
                    notes: "طلب إعادة تخزين تلقائي",
                    type: "restock",
                }),
            });
            showToast("تم إنشاء طلب إعادة التخزين", "success");
        } catch {
            showToast("خطأ في إنشاء الطلب", "error");
        }
    };

    const submitNewRequest = async () => {
        if (!requestProduct.trim() || !requestQuantity.trim()) {
            showToast("يرجى ملء جميع الحقول المطلوبة", "error");
            return;
        }

        try {
            await fetchAPI("/api/requests", {
                method: "POST",
                body: JSON.stringify({
                    product_name: requestProduct,
                    quantity: parseInt(requestQuantity),
                    notes: requestNotes,
                    type: "new",
                }),
            });
            showToast("تم إرسال الطلب بنجاح", "success");
            setRequestDialog(false);
            setRequestProduct("");
            setRequestQuantity("");
            setRequestNotes("");
        } catch {
            showToast("خطأ في إرسال الطلب", "error");
        }
    };

    const recentSalesColumns: Column<RecentSale>[] = [
        { key: "invoice_number", header: "رقم الفاتورة", dataLabel: "رقم الفاتورة" },
        {
            key: "total_amount",
            header: "المبلغ",
            dataLabel: "المبلغ",
            render: (item) => formatCurrency(item.total_amount),
        },
        {
            key: "payment_type",
            header: "نوع الدفع",
            dataLabel: "نوع الدفع",
            render: (item) => (
                <span className={`badge ${item.payment_type === "cash" ? "badge-success" : "badge-warning"}`}>
                    {item.payment_type === "cash" ? "نقدي" : "آجل"}
                </span>
            ),
        },
        {
            key: "created_at",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => formatDate(item.created_at),
        },
    ];

    const lowStockColumns: Column<LowStockProduct>[] = [
        { key: "name", header: "المنتج", dataLabel: "المنتج" },
        {
            key: "stock",
            header: "المخزون الحالي",
            dataLabel: "المخزون الحالي",
            render: (item) => <span className="text-danger">{item.stock}</span>,
        },
        { key: "min_stock", header: "الحد الأدنى", dataLabel: "الحد الأدنى" },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <Button
                    size="sm"
                    variant="primary"
                    onClick={() => initiateRestock(item.id, item.name)}
                    icon="plus"
                >
                    طلب تخزين
                </Button>
            ),
        },
    ];

    const expiringColumns: Column<ExpiringProduct>[] = [
        { key: "name", header: "المنتج", dataLabel: "المنتج" },
        {
            key: "expiry_date",
            header: "تاريخ الانتهاء",
            dataLabel: "تاريخ الانتهاء",
            render: (item) => <span className="text-warning">{formatDate(item.expiry_date)}</span>,
        },
        { key: "stock", header: "الكمية", dataLabel: "الكمية" },
    ];

    return (
        <MainLayout requiredModule="dashboard">
            <PageHeader title="لوحة التحكم" user={user} showDate={true} />

            <ExchangeRatesWidget />

            {/* Stats Grid */}
            <div className="dashboard-stats animate-fade">
                <div className="stat-card" onClick={openLowStockDialog} style={{ cursor: "pointer" }}>
                    <div className="stat-icon sales">
                        {getIcon("cart")}
                    </div>
                    <div className="stat-info">
                        <h3>مبيعات اليوم</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.daily_sales || 0)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon products">
                        {getIcon("box")}
                    </div>
                    <div className="stat-info">
                        <h3>إجمالي المنتجات</h3>
                        <p>{isLoading ? "..." : stats?.total_products || 0}</p>
                    </div>
                </div>

                <div className="stat-card" onClick={openLowStockDialog} style={{ cursor: "pointer" }}>
                    <div className="stat-icon alert">
                        {getIcon("alert")}
                    </div>
                    <div className="stat-info">
                        <h3>مخزون منخفض</h3>
                        <p>{isLoading ? "..." : stats?.low_stock_count || 0}</p>
                    </div>
                </div>

                <div className="stat-card" onClick={openExpiringDialog} style={{ cursor: "pointer" }}>
                    <div className="stat-icon total">
                        {getIcon("clock")}
                    </div>
                    <div className="stat-info">
                        <h3>قرب انتهاء الصلاحية</h3>
                        <p>{isLoading ? "..." : stats?.expiring_soon_count || 0}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon sales">
                        {getIcon("chart-line")}
                    </div>
                    <div className="stat-info">
                        <h3>إجمالي المبيعات</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.total_sales || 0)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon alert">
                        {getIcon("dollar")}
                    </div>
                    <div className="stat-info">
                        <h3>مصروفات اليوم</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.today_expenses || 0)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon total">
                        {getIcon("wallet")}
                    </div>
                    <div className="stat-info">
                        <h3>إجمالي المصروفات</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.total_expenses || 0)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon products">
                        {getIcon("coins")}
                    </div>
                    <div className="stat-info">
                        <h3>إيرادات اليوم</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.today_revenues || 0)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon sales">
                        {getIcon("hand-holding")}
                    </div>
                    <div className="stat-info">
                        <h3>إجمالي الإيرادات</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.total_revenues || 0)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon products">
                        {getIcon("building")}
                    </div>
                    <div className="stat-info">
                        <h3>إجمالي الأصول</h3>
                        <p>{isLoading ? "..." : formatCurrency(stats?.total_assets || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Dashboard Sections */}
            <div className="dashboard-sections animate-slide">
                {/* Recent Sales */}
                <div className="section-card">
                    <div className="section-header">
                        <h3>المبيعات الأخيرة</h3>
                        {canAccess(permissions, "sales", "view") && (
                            <Button href="/sales/sales" size="sm" variant="secondary">
                                عرض الكل
                            </Button>
                        )}
                    </div>
                    <Table
                        columns={recentSalesColumns}
                        data={recentSales.slice(0, 5)}
                        keyExtractor={(item) => item.id}
                        emptyMessage="لا توجد مبيعات حديثة"
                        isLoading={isLoading}
                    />
                </div>

                {/* Quick Actions */}
                <div className="section-card quick-actions">
                    <div className="section-header">
                        <h3>إجراءات سريعة</h3>
                    </div>
                    <div className="action-buttons">
                        {canAccess(permissions, "sales", "create") && (
                            <Button href="/sales/sales" variant="primary" icon="plus">
                                بيع جديد
                            </Button>
                        )}
                        {canAccess(permissions, "products", "create") && (
                            <Button href="/inventory/products" variant="secondary" icon="box">
                                إضافة منتج
                            </Button>
                        )}
                        {canAccess(permissions, "purchases", "create") && (
                            <Button
                                variant="secondary"
                                onClick={() => setRequestDialog(true)}
                                icon="clipboard-list"
                            >
                                طلب جديد
                            </Button>
                        )}
                        {canAccess(permissions, "reports", "view") && (
                            <Button href="/system/reports" variant="secondary" icon="chart-bar">
                                عرض التقارير
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Low Stock Dialog */}
            <Dialog
                isOpen={lowStockDialog}
                onClose={() => setLowStockDialog(false)}
                title="تنبيهات المخزون المنخفض"
                maxWidth="700px"
            >
                <Table
                    columns={lowStockColumns}
                    data={lowStockProducts}
                    keyExtractor={(item) => item.id}
                    emptyMessage="لا توجد منتجات بمخزون منخفض"
                />
            </Dialog>

            {/* Expiring Soon Dialog */}
            <Dialog
                isOpen={expiringDialog}
                onClose={() => setExpiringDialog(false)}
                title="تنبيهات قرب انتهاء الصلاحية"
                maxWidth="700px"
            >
                <Table
                    columns={expiringColumns}
                    data={expiringProducts}
                    keyExtractor={(item) => item.id}
                    emptyMessage="لا توجد منتجات قرب انتهاء صلاحيتها"
                />
            </Dialog>

            {/* New Request Dialog */}
            <Dialog
                isOpen={requestDialog}
                onClose={() => setRequestDialog(false)}
                title="طلب جديد"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setRequestDialog(false)}
                        >
                            إلغاء
                        </Button>
                        <Button variant="primary" onClick={submitNewRequest}>
                            إرسال الطلب
                        </Button>
                    </>
                }
            >
                <div className="form-group">
                    <label htmlFor="requestProduct">اسم المنتج *</label>
                    <input
                        type="text"
                        id="requestProduct"
                        value={requestProduct}
                        onChange={(e) => setRequestProduct(e.target.value)}
                        placeholder="أدخل اسم المنتج"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="requestQuantity">الكمية المطلوبة *</label>
                    <input
                        type="number"
                        id="requestQuantity"
                        value={requestQuantity}
                        onChange={(e) => setRequestQuantity(e.target.value)}
                        placeholder="أدخل الكمية"
                        min="1"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="requestNotes">ملاحظات</label>
                    <textarea
                        id="requestNotes"
                        value={requestNotes}
                        onChange={(e) => setRequestNotes(e.target.value)}
                        placeholder="أدخل أي ملاحظات إضافية"
                        rows={3}
                    />
                </div>
            </Dialog>
        </MainLayout>
    );
}

