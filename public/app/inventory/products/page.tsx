"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, showToast, Column } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess, checkAuth } from "@/lib/auth";
import { Icon } from "@/lib/icons";
import { Product, Category } from "./types";
import { useProducts } from "./useProducts";

export default function ProductsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const {
        products,
        categories,
        currentPage,
        totalPages,
        isLoading,
        loadProducts,
        loadCategories,
        saveProduct,
        deleteProduct
    } = useProducts();

    // Dialogs
    const [productDialog, setProductDialog] = useState(false);
    const [categoryDialog, setCategoryDialog] = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Form
    const [formData, setFormData] = useState({
        name: "",
        barcode: "",
        category_id: "",
        purchase_price: "",
        selling_price: "",
        stock: "",
        min_stock: "10",
        unit_type: "piece",
        units_per_package: "1",
        description: "",
        profit_margin: "",
    });

    const [newCategoryName, setNewCategoryName] = useState("");

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            await Promise.all([loadProducts(), loadCategories()]);
        };
        init();
    }, [loadProducts, loadCategories]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        loadProducts(1, value);
    };

    const openAddDialog = () => {
        setSelectedProduct(null);
        setFormData({
            name: "",
            barcode: "",
            category_id: categories[0]?.id?.toString() || "",
            purchase_price: "",
            selling_price: "",
            stock: "",
            min_stock: "10",
            unit_type: "piece",
            units_per_package: "1",
            description: "",
            profit_margin: "",
        });
        setProductDialog(true);
    };

    const openEditDialog = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            barcode: product.barcode || "",
            category_id: String(product.category_id || ""),
            purchase_price: String(product.purchase_price || ""),
            selling_price: String(product.selling_price || ""),
            stock: String(product.stock || "0"),
            min_stock: String(product.min_stock || "10"),
            unit_type: product.unit_type || "piece",
            units_per_package: String(product.items_per_unit || "1"),
            description: product.description || "",
            profit_margin: String(product.profit_margin || ""),
        });
        setProductDialog(true);
    };

    const calculatePrices = (field: string, value: string) => {
        const newData = { ...formData, [field]: value };
        const purchasePrice = parseFloat(newData.purchase_price) || 0;
        const sellingPrice = parseFloat(newData.selling_price) || 0;
        const margin = parseFloat(newData.profit_margin) || 0;

        if (field === "profit_margin" && purchasePrice > 0) {
            newData.selling_price = (purchasePrice * (1 + margin / 100)).toFixed(2);
        } else if (field === "selling_price" && purchasePrice > 0) {
            newData.profit_margin = (((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(2);
        } else if (field === "purchase_price" && margin > 0) {
            newData.selling_price = (purchasePrice * (1 + margin / 100)).toFixed(2);
        }

        setFormData(newData);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.purchase_price || !formData.selling_price) {
            showToast("يرجى ملء جميع الحقول المطلوبة", "error");
            return;
        }

        const payload = {
            name: formData.name,
            barcode: formData.barcode,
            category_id: parseInt(formData.category_id),
            unit_price: parseFloat(formData.selling_price),
            minimum_profit_margin: parseFloat(formData.profit_margin) || 0,
            stock_quantity: parseInt(formData.stock) || 0,
            unit_name: formData.unit_type === 'ctn' ? 'كرتون' : 'حبة',
            items_per_unit: parseInt(formData.units_per_package) || 1,
            sub_unit_name: formData.unit_type === 'ctn' ? 'حبة' : null,
            description: formData.description,
            purchase_price: parseFloat(formData.purchase_price),
        };

        const success = await saveProduct(payload, selectedProduct?.id);
        if (success) {
            setProductDialog(false);
            loadProducts(currentPage, searchTerm);
        }
    };

    const addCategory = async () => {
        if (!newCategoryName.trim()) {
            showToast("يرجى إدخال اسم الفئة", "error");
            return;
        }
        try {
            const res = await fetchAPI("categories", {
                method: "POST",
                body: JSON.stringify({ name: newCategoryName }),
            });
            if (res.success) {
                showToast("تمت إضافة الفئة بنجاح", "success");
                setCategoryDialog(false);
                setNewCategoryName("");
                loadCategories();
            }
        } catch {
            showToast("خطأ في إضافة الفئة", "error");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const success = await deleteProduct(deleteId);
        if (success) {
            setConfirmDialog(false);
            loadProducts(currentPage, searchTerm);
        }
    };

    const columns: Column<Product>[] = [
        { key: "name", header: "اسم المنتج", dataLabel: "اسم المنتج" },
        { key: "barcode", header: "الباركود", dataLabel: "الباركود" },
        { key: "category_name", header: "الفئة", dataLabel: "الفئة" },
        {
            key: "selling_price",
            header: "سعر البيع",
            dataLabel: "سعر البيع",
            render: (it) => formatCurrency(it.selling_price || 0)
        },
        {
            key: "stock",
            header: "المخزون",
            dataLabel: "المخزون",
            render: (it) => (
                <div className="stock-badge-container">
                    <span>{it.stock}</span>
                    {(it.stock || 0) <= 0 ? (
                        <span className="badge badge-danger">نفذ</span>
                    ) : (it.stock || 0) <= (it.min_stock || 10) ? (
                        <span className="badge badge-warning">منخفض</span>
                    ) : (
                        <span className="badge badge-success">متوفر</span>
                    )}
                </div>
            )
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (it) => (
                <div className="action-buttons">
                    <button className="icon-btn view" onClick={() => { setSelectedProduct(it); setViewDialog(true); }} title="عرض">
                        <Icon name="eye" />
                    </button>
                    {canAccess(permissions, "products", "edit") && (
                        <button className="icon-btn edit" onClick={() => openEditDialog(it)} title="تعديل">
                            <Icon name="edit" />
                        </button>
                    )}
                    {canAccess(permissions, "products", "delete") && (
                        <button className="icon-btn delete" onClick={() => { setDeleteId(it.id); setConfirmDialog(true); }} title="حذف">
                            <Icon name="trash" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <MainLayout requiredModule="products">
            <PageHeader
                title="المنتجات / المخزون"
                user={user}
                searchInput={
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو الباركود..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="search-control"
                    />
                }
                actions={
                    canAccess(permissions, "products", "create") && (
                        <button className="btn btn-primary" onClick={openAddDialog}>
                            <Icon name="plus" /> إضافة منتج
                        </button>
                    )
                }
            />

            <div className="sales-card animate-fade">
                <Table
                    columns={columns}
                    data={products}
                    keyExtractor={(it) => it.id}
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: (page) => loadProducts(page, searchTerm)
                    }}
                />
            </div>

            {/* Product Dialog */}
            <Dialog
                isOpen={productDialog}
                onClose={() => setProductDialog(false)}
                title={selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                maxWidth="800px"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setProductDialog(false)}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {selectedProduct ? "تحديث" : "إضافة"}
                        </button>
                    </>
                }
            >
                <div className="form-row">
                    <div className="form-group">
                        <label>اسم المنتج *</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>الباركود</label>
                        <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>الفئة</label>
                        <div className="input-with-action">
                            <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCategoryDialog(true)}>
                                <Icon name="plus" />
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>نوع الوحدة</label>
                        <select value={formData.unit_type} onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}>
                            <option value="piece">حبة / قطعة</option>
                            <option value="ctn">كرتون</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>سعر الشراء *</label>
                        <input type="number" value={formData.purchase_price} onChange={(e) => calculatePrices("purchase_price", e.target.value)} step="0.01" />
                    </div>
                    <div className="form-group">
                        <label>هامش الربح (%)</label>
                        <input type="number" value={formData.profit_margin} onChange={(e) => calculatePrices("profit_margin", e.target.value)} step="0.1" />
                    </div>
                    <div className="form-group">
                        <label>سعر البيع *</label>
                        <input type="number" value={formData.selling_price} onChange={(e) => calculatePrices("selling_price", e.target.value)} step="0.01" />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>وحدات/صندوق</label>
                        <input type="number" value={formData.units_per_package} onChange={(e) => calculatePrices("units_per_package", e.target.value)} min="1" />
                    </div>
                    <div className="form-group">
                        <label>المخزون الحالي</label>
                        <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>حد الطلب الأدنى</label>
                        <input type="number" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} />
                    </div>
                </div>

                <div className="form-group">
                    <label>الوصف</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>
            </Dialog>

            <Dialog isOpen={categoryDialog} onClose={() => setCategoryDialog(false)} title="إضافة فئة جديدة" maxWidth="400px">
                <div className="form-group">
                    <label>اسم الفئة *</label>
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                </div>
                <div className="dialog-footer">
                    <button className="btn btn-secondary" onClick={() => setCategoryDialog(false)}>إلغاء</button>
                    <button className="btn btn-primary" onClick={addCategory}>إضافة</button>
                </div>
            </Dialog>

            <Dialog isOpen={viewDialog} onClose={() => setViewDialog(false)} title="تفاصيل المنتج" maxWidth="600px">
                {selectedProduct && (
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="label">اسم المنتج</span>
                            <span className="value strong">{selectedProduct.name}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">الباركود</span>
                            <span className="value">{selectedProduct.barcode || "-"}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">الفئة</span>
                            <span className="value">{selectedProduct.category_name || "-"}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">سعر الشراء</span>
                            <span className="value">{formatCurrency(selectedProduct.purchase_price || 0)}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">سعر البيع</span>
                            <span className="value strong primary">{formatCurrency(selectedProduct.selling_price || 0)}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">هامش الربح</span>
                            <span className="value">{selectedProduct.profit_margin}%</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">المخزون</span>
                            <span className="value">{selectedProduct.stock} {selectedProduct.unit_name}</span>
                        </div>
                        <div className="detail-item full-width">
                            <span className="label">الوصف</span>
                            <span className="value">{selectedProduct.description || "-"}</span>
                        </div>
                    </div>
                )}
            </Dialog>

            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => setConfirmDialog(false)}
                onConfirm={handleDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا المنتج؟ سيتم حذف جميع السجلات المتعلقة به."
            />
        </MainLayout>
    );
}
