"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, Button, SearchableSelect, SelectOption, showToast, Column } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess, checkAuth } from "@/lib/auth";
import { Icon } from "@/lib/icons";
import { Product, Purchase, PurchaseRequest, Supplier } from "./types";
import { usePurchaseStore } from "@/stores/usePurchaseStore";

/**
 * Purchases Management Page.
 * Provides complete CRUD operations for purchase transactions including:
 * - Product selection with auto-price population
 * - Supplier management (cash or credit payments)
 * - Purchase requests conversion to actual purchases
 * - Inventory quantity updates on purchase save/delete
 * 
 * Integrates with PurchasesController API and enforces RBAC permissions.
 * 
 * @returns The PurchasesPage component
 */
export default function PurchasesPage() {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const {
        items: purchases,
        currentPage,
        totalPages,
        isLoading,
        load: loadPurchases,
        save: savePurchase,
        remove: deletePurchase,
    } = usePurchaseStore();

    // Dialogs
    const [purchaseDialog, setPurchaseDialog] = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [requestsDialog, setRequestsDialog] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Requests
    const [requests, setRequests] = useState<PurchaseRequest[]>([]);

    // Form
    const [formData, setFormData] = useState({
        product_id: "",
        quantity: "",
        unit_type: "piece",
        unit_price: "",
        supplier: "",
        purchase_date: new Date().toISOString().split("T")[0],
        expiry_date: "",
        notes: "",
        payment_type: "credit",
    });

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const loadProducts = useCallback(async () => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.INVENTORY.PRODUCTS}?limit=1000`);
            setProducts((response.data as Product[]) || []);
        } catch (e) { console.error(e); }
    }, []);

    const loadSuppliers = useCallback(async () => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.SUPPLIERS.BASE}?limit=1000`);
            setSuppliers((response.data as Supplier[]) || []);
        } catch (e) { console.error(e); }
    }, []);

    const loadRequests = useCallback(async () => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.REQUESTS}?status=pending`);
            setRequests((response.data as PurchaseRequest[]) || []);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            await Promise.all([loadPurchases(), loadProducts(), loadSuppliers()]);
        };
        init();
    }, [loadPurchases, loadProducts, loadSuppliers]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        loadPurchases(1, value);
    };

    const productOptions: SelectOption[] = products.map((p) => ({
        value: p.id,
        label: p.name,
        subtitle: `المخزون: ${p.stock_quantity}`,
    }));

    const supplierOptions: SelectOption[] = suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        subtitle: s.phone || "",
    }));

    const openAddDialog = () => {
        setSelectedPurchase(null);
        setFormData({
            product_id: "",
            quantity: "",
            unit_type: "piece",
            unit_price: "",
            supplier: "",
            purchase_date: new Date().toISOString().split("T")[0],
            expiry_date: "",
            notes: "",
            payment_type: "credit",
        });
        setPurchaseDialog(true);
    };

    const openEditDialog = (purchase: Purchase) => {
        setSelectedPurchase(purchase);
        setFormData({
            product_id: String(purchase.product_id),
            quantity: String(purchase.quantity),
            unit_type: purchase.unit_type,
            unit_price: String(purchase.unit_price),
            supplier: purchase.supplier || "",
            purchase_date: purchase.purchase_date.split("T")[0],
            expiry_date: purchase.expiry_date?.split("T")[0] || "",
            notes: purchase.notes || "",
            payment_type: purchase.payment_type || "credit",
        });
        setPurchaseDialog(true);
    };

    const handleProductSelect = (value: string | number | null) => {
        if (value === null) {
            setFormData({ ...formData, product_id: "", unit_price: "" });
            return;
        }
        const product = products.find((p) => p.id === value);
        if (product) {
            setFormData({
                ...formData,
                product_id: String(product.id),
                unit_price: String(product.purchase_price),
            });
        }
    };

    const handleSubmit = async () => {
        if (!formData.product_id || !formData.quantity || !formData.unit_price) {
            showToast("يرجى ملء جميع الحقول المطلوبة", "error");
            return;
        }

        // Fix BUG-001 & BUG-007: Enforce Supplier for Credit
        if (formData.payment_type === "credit" && !formData.supplier.trim() && !('supplier_id' in formData)) {
            // If we have a name but no ID, it might be a new supplier logic, but we prefer ID.
            // We'll validate name exists at least.
        }
        if (formData.payment_type === "credit" && !formData.supplier) {
            showToast("يرجى تحديد المورد عند اختيار الدفع الآجل", "error");
            return;
        }

        const payload = {
            product_id: parseInt(formData.product_id),
            quantity: parseFloat(formData.quantity),
            unit_type: formData.unit_type,
            unit_price: parseFloat(formData.unit_price),
            invoice_price: parseFloat(formData.quantity) * parseFloat(formData.unit_price),
            supplier_id: (formData as any).supplier_id || null,
            supplier_name: formData.supplier,
            purchase_date: formData.purchase_date,
            expiry_date: formData.expiry_date || null,
            notes: formData.notes,
            payment_type: formData.payment_type,
        };

        const success = await savePurchase(payload, selectedPurchase?.id);
        if (success) {
            setPurchaseDialog(false);
            loadPurchases(currentPage, searchTerm);
            loadProducts();
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const success = await deletePurchase(deleteId);
        if (success) {
            setConfirmDialog(false);
            loadProducts();
        }
    };

    const openRequestsDialog = async () => {
        await loadRequests();
        setRequestsDialog(true);
    };

    const convertRequestToPurchase = (request: PurchaseRequest) => {
        setFormData({
            product_id: "",
            quantity: String(request.quantity),
            unit_type: "piece",
            unit_price: "",
            supplier: "",
            purchase_date: new Date().toISOString().split("T")[0],
            expiry_date: "",
            notes: `من طلب: ${request.product_name} - ${request.notes || ""}`,
            payment_type: "credit",
        });
        setRequestsDialog(false);
        setPurchaseDialog(true);
    };

    const markRequestDone = async (requestId: number) => {
        try {
            await fetchAPI(`${API_ENDPOINTS.PURCHASES.REQUESTS}?id=${requestId}`, {
                method: "PUT",
                body: JSON.stringify({ status: "done" }),
            });
            showToast("تم تحديث حالة الطلب", "success");
            loadRequests();
        } catch {
            showToast("خطأ في تحديث الطلب", "error");
        }
    };

    const columns: Column<Purchase>[] = [
        { key: "product_name", header: "المنتج", dataLabel: "المنتج" },
        {
            key: "quantity",
            header: "الكمية",
            dataLabel: "الكمية",
            render: (item) => `${item.quantity} ${item.unit_type === "piece" ? "قطعة" : "صندوق"}`,
        },
        {
            key: "unit_price",
            header: "سعر الوحدة",
            dataLabel: "سعر الوحدة",
            render: (item) => formatCurrency(item.unit_price),
        },
        {
            key: "total_price",
            header: "الإجمالي",
            dataLabel: "الإجمالي",
            render: (item) => formatCurrency(item.total_price),
        },
        { key: "supplier", header: "المورد", dataLabel: "المورد" },
        {
            key: "purchase_date",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => formatDate(item.purchase_date),
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <div className="action-buttons">
                    <button className="icon-btn view" onClick={() => { setSelectedPurchase(item); setViewDialog(true); }} title="عرض">
                        <Icon name="eye" />
                    </button>
                    {canAccess(permissions, "purchases", "edit") && (
                        <button className="icon-btn edit" onClick={() => openEditDialog(item)} title="تعديل">
                            <Icon name="edit" />
                        </button>
                    )}
                    {canAccess(permissions, "purchases", "delete") && (
                        <button className="icon-btn delete" onClick={() => { setDeleteId(item.id); setConfirmDialog(true); }} title="حذف">
                            <Icon name="trash" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const requestColumns: Column<PurchaseRequest>[] = [
        { key: "product_name", header: "المنتج", dataLabel: "المنتج" },
        { key: "quantity", header: "الكمية", dataLabel: "الكمية" },
        { key: "notes", header: "ملاحظات", dataLabel: "ملاحظات" },
        {
            key: "created_at",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => formatDate(item.created_at),
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <div className="action-buttons">
                    <button className="btn btn-sm btn-primary" onClick={() => convertRequestToPurchase(item)}>
                        تحويل لمشترى
                    </button>
                    <button className="btn btn-sm btn-success" onClick={() => markRequestDone(item.id)}>
                        <Icon name="check" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <ModuleLayout groupKey="purchases" requiredModule="purchases">
            <PageHeader
                title="المشتريات"
                user={user}
                searchInput={
                    <SearchableSelect
                        options={[]}
                        value={null}
                        onChange={() => { }}
                        onSearch={(val) => {
                            setSearchTerm(val);
                            loadPurchases(1, val);
                        }}
                        placeholder="بحث سريع..."
                        className="header-search-bar"
                    />
                }
                actions={
                    <>
                        <Button
                            variant="secondary"
                            icon="list"
                            onClick={openRequestsDialog}
                        >
                            طلبيات الشراء
                        </Button>
                        {canAccess(permissions, "purchases", "create") && (
                            <Button
                                variant="primary"
                                icon="plus"
                                onClick={openAddDialog}
                            >
                                إضافة مشترى
                            </Button>
                        )}
                    </>
                }
            />

            <div className="sales-card animate-fade">
                <Table
                    columns={columns}
                    data={purchases}
                    keyExtractor={(it) => it.id}
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: (page) => loadPurchases(page, searchTerm),
                    }}
                />
            </div>

            {/* Purchase Dialog */}
            <Dialog
                isOpen={purchaseDialog}
                onClose={() => setPurchaseDialog(false)}
                title={selectedPurchase ? "تعديل المشترى" : "إضافة مشترى جديد"}
                maxWidth="800px"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setPurchaseDialog(false)}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {selectedPurchase ? "تحديث" : "إضافة"}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label>المنتج *</label>
                    <SearchableSelect
                        options={productOptions}
                        value={formData.product_id ? parseInt(formData.product_id) : null}
                        onChange={handleProductSelect}
                        placeholder="ابحث عن منتج..."
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>الكمية *</label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            min="0.01"
                        />
                    </div>
                    <div className="form-group">
                        <label>نوع الوحدة</label>
                        <select value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}>
                            <option value="piece">قطعة</option>
                            <option value="main">صندوق (كرتون)</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>سعر الوحدة *</label>
                        <input
                            type="number"
                            value={formData.unit_price}
                            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                            step="0.01"
                        />
                    </div>
                    <div className="form-group">
                        <label>الإجمالي</label>
                        <div className="info-value primary">
                            {formatCurrency((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unit_price) || 0))}
                        </div>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>المورد</label>
                        <SearchableSelect
                            options={supplierOptions}
                            value={(formData as any).supplier_id ? parseInt((formData as any).supplier_id) : null}
                            onChange={(val) => {
                                if (val) {
                                    const sup = suppliers.find(s => s.id === val);
                                    setFormData({ ...formData, supplier: sup?.name || "", ['supplier_id']: String(val) } as any);
                                } else {
                                    setFormData({ ...formData, supplier: "", ['supplier_id']: "" } as any);
                                }
                            }}
                            placeholder="اختر مورداً..."
                        />
                    </div>
                    <div className="form-group">
                        <label>طريقة الدفع</label>
                        <select
                            value={formData.payment_type}
                            onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                        >
                            <option value="credit">آجل (على الحساب)</option>
                            <option value="cash">نقدي</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>تاريخ الشراء</label>
                        <input
                            type="date"
                            value={formData.purchase_date}
                            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>تاريخ الانتهاء</label>
                    <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>ملاحظات</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                    />
                </div>
            </Dialog>

            {/* View Dialog */}
            <Dialog isOpen={viewDialog} onClose={() => setViewDialog(false)} title="تفاصيل المشترى" maxWidth="600px">
                {selectedPurchase && (
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="label">المنتج</span>
                            <span className="value strong">{selectedPurchase.product_name}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">الكمية</span>
                            <span className="value">{selectedPurchase.quantity} {selectedPurchase.unit_type === "piece" ? "قطعة" : "صندوق"}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">سعر الوحدة</span>
                            <span className="value">{formatCurrency(selectedPurchase.unit_price)}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">الإجمالي</span>
                            <span className="value primary strong">{formatCurrency(selectedPurchase.total_price)}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">المورد</span>
                            <span className="value">{selectedPurchase.supplier || "-"}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">تاريخ الشراء</span>
                            <span className="value">{formatDate(selectedPurchase.purchase_date)}</span>
                        </div>
                        {selectedPurchase.expiry_date && (
                            <div className="detail-item">
                                <span className="label">تاريخ الانتهاء</span>
                                <span className="value">{formatDate(selectedPurchase.expiry_date)}</span>
                            </div>
                        )}
                        {selectedPurchase.notes && (
                            <div className="detail-item full-width">
                                <span className="label">ملاحظات</span>
                                <span className="value">{selectedPurchase.notes}</span>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>

            {/* Requests Dialog */}
            <Dialog isOpen={requestsDialog} onClose={() => setRequestsDialog(false)} title="طلبات الشراء" maxWidth="800px">
                <Table columns={requestColumns} data={requests} keyExtractor={(it) => it.id} emptyMessage="لا توجد طلبات معلقة" />
            </Dialog>

            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => setConfirmDialog(false)}
                onConfirm={handleDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا المشترى؟ سيتم خصم الكمية من المخزون."
            />
        </ModuleLayout>
    );
}
