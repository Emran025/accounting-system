"use client";

import { useState, useEffect } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, showToast, Column } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess, checkAuth } from "@/lib/auth";
import { Icon } from "@/lib/icons";
import { Customer } from "./types";
import { useCustomers } from "./useCustomers";

export default function ARCustomersPage() {
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const {
        customers,
        currentPage,
        totalPages,
        isLoading,
        loadCustomers,
        saveCustomer,
        deleteCustomer
    } = useCustomers();

    // Dialogs
    const [formDialog, setFormDialog] = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Form
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        tax_number: "",
    });

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            loadCustomers();
        };
        init();
    }, [loadCustomers]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        loadCustomers(1, value);
    };

    const openAddDialog = () => {
        setSelectedCustomer(null);
        setFormData({ name: "", phone: "", email: "", address: "", tax_number: "" });
        setFormDialog(true);
    };

    const openEditDialog = (c: Customer) => {
        setSelectedCustomer(c);
        setFormData({
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            address: c.address || "",
            tax_number: c.tax_number || "",
        });
        setFormDialog(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast("يرجى إدخال اسم العميل", "error");
            return;
        }

        const success = await saveCustomer(formData, selectedCustomer?.id);
        if (success) {
            setFormDialog(false);
            loadCustomers(currentPage, searchTerm);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const success = await deleteCustomer(deleteId);
        if (success) {
            setConfirmDialog(false);
            loadCustomers(currentPage, searchTerm);
        }
    };

    const columns: Column<Customer>[] = [
        { key: "name", header: "اسم العميل", dataLabel: "اسم العميل" },
        { key: "phone", header: "الهاتف", dataLabel: "الهاتف" },
        {
            key: "total_debt",
            header: "إجمالي الدين",
            dataLabel: "إجمالي الدين",
            render: (it) => formatCurrency(it.total_debt)
        },
        {
            key: "total_paid",
            header: "إجمالي المدفوع",
            dataLabel: "إجمالي المدفوع",
            render: (it) => <span className="text-success">{formatCurrency(it.total_paid)}</span>
        },
        {
            key: "balance",
            header: "الرصيد المتبقي",
            dataLabel: "الرصيد المتبقي",
            render: (it) => (
                <span className={it.balance > 0 ? "text-danger strong" : "text-success"}>
                    {formatCurrency(it.balance)}
                </span>
            )
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (it) => (
                <div className="action-buttons">
                    <button className="icon-btn view" onClick={() => { setSelectedCustomer(it); setViewDialog(true); }} title="عرض">
                        <Icon name="eye" />
                    </button>
                    {canAccess(permissions, "ar_customers", "edit") && (
                        <button className="icon-btn edit" onClick={() => openEditDialog(it)} title="تعديل">
                            <Icon name="edit" />
                        </button>
                    )}
                    {canAccess(permissions, "ar_customers", "delete") && (
                        <button className="icon-btn delete" onClick={() => { setDeleteId(it.id); setConfirmDialog(true); }} title="حذف">
                            <Icon name="trash" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <MainLayout requiredModule="ar_customers">
            <PageHeader
                title="عملاء الآجل (Accounts Receivable)"
                user={user}
                searchInput={
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو الهاتف..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="search-control"
                    />
                }
                actions={
                    canAccess(permissions, "ar_customers", "create") && (
                        <button className="btn btn-primary" onClick={openAddDialog}>
                            <Icon name="plus" /> إضافة عميل
                        </button>
                    )
                }
            />

            <div className="sales-card animate-fade">
                <Table
                    columns={columns}
                    data={customers}
                    keyExtractor={(it) => it.id}
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: (page) => loadCustomers(page, searchTerm)
                    }}
                />
            </div>

            {/* Form Dialog */}
            <Dialog
                isOpen={formDialog}
                onClose={() => setFormDialog(false)}
                title={selectedCustomer ? "تعديل العميل" : "إضافة عميل جديد"}
                maxWidth="600px"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setFormDialog(false)}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{selectedCustomer ? "تحديث" : "إضافة"}</button>
                    </>
                }
            >
                <div className="form-group">
                    <label>اسم العميل *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>رقم الهاتف</label>
                        <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>البريد الإلكتروني</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                </div>

                <div className="form-group">
                    <label>الرقم الضريبي</label>
                    <input type="text" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>العنوان</label>
                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
                </div>
            </Dialog>

            {/* View Dialog */}
            <Dialog isOpen={viewDialog} onClose={() => setViewDialog(false)} title="تفاصيل العميل" maxWidth="600px">
                {selectedCustomer && (
                    <div className="customer-details">
                        <div className="details-grid">
                            <div className="detail-item">
                                <span className="label">اسم العميل</span>
                                <span className="value strong">{selectedCustomer.name}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">الهاتف</span>
                                <span className="value">{selectedCustomer.phone || "-"}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">البريد الإلكتروني</span>
                                <span className="value">{selectedCustomer.email || "-"}</span>
                            </div>
                            <div className="detail-item">
                                <span className="label">الرقم الضريبي</span>
                                <span className="value">{selectedCustomer.tax_number || "-"}</span>
                            </div>
                            <div className="detail-item full-width">
                                <span className="label">العنوان</span>
                                <span className="value">{selectedCustomer.address || "-"}</span>
                            </div>
                        </div>

                        <div className="balance-cards">
                            <div className="balance-card">
                                <span className="label">إجمالي المديونية</span>
                                <span className="value danger">{formatCurrency(selectedCustomer.total_debt)}</span>
                            </div>
                            <div className="balance-card">
                                <span className="label">إجمالي المدفوعات</span>
                                <span className="value success">{formatCurrency(selectedCustomer.total_paid)}</span>
                            </div>
                            <div className="balance-card highlighted">
                                <span className="label">الرصيد المستحق</span>
                                <span className={`value ${selectedCustomer.balance > 0 ? "danger" : "success"}`}>
                                    {formatCurrency(selectedCustomer.balance)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>

            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => setConfirmDialog(false)}
                onConfirm={handleDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع الفواتير المرتبطة به."
            />
        </MainLayout>
    );
}
