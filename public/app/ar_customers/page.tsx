"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, showToast, Column, Button, ActionButtons } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess, checkAuth } from "@/lib/auth";
import { Icon, getIcon } from "@/lib/icons";
import { Customer } from "./types";
import { useCustomerStore } from "@/stores/useCustomerStore";

export default function ARCustomersPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const {
        items: customers,
        currentPage,
        totalPages,
        isLoading,
        load: loadCustomers,
        save: saveCustomer,
        remove: deleteCustomer,
    } = useCustomerStore();

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
                <ActionButtons
                    actions={[
                        {
                            icon: "list",
                            title: "كشف الحساب",
                            variant: "view",
                            onClick: () => { router.push(`/finance/ar_ledger?customer_id=${it.id}`); }
                        },
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "info",
                            onClick: () => { setSelectedCustomer(it); setViewDialog(true); },
                        },
                        {
                            icon: "edit",
                            title: "تعديل",
                            variant: "edit",
                            onClick: () => { openEditDialog(it) },
                            hidden: canAccess(permissions, "ar_customers", "edit")
                        },
                        {
                            icon: "trash",
                            title: "حذف",
                            variant: "delete",
                            onClick: () => { setDeleteId(it.id); setConfirmDialog(true); },
                            hidden: canAccess(permissions, "ar_customers", "delete")
                        }
                    ]}
                />
            ),
        }
    ];

    return (
        <ModuleLayout groupKey="sales" requiredModule="ar_customers">
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
                        <Button variant="primary" icon="plus" onClick={openAddDialog}>
                            إضافة عميل
                        </Button>
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
                        <Button variant="secondary" onClick={() => setFormDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleSubmit}>{selectedCustomer ? "تحديث" : "إضافة"}</Button>
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
            <Dialog
                isOpen={viewDialog}
                onClose={() => setViewDialog(false)}
                title="ملف العميل"
                maxWidth="600px"
            >
                {selectedCustomer && (
                    <div className="customer-profile-view">
                        <div className="profile-header">
                            <div className="profile-avatar">
                                <Icon name="user" size={32} />
                            </div>
                            <div className="profile-info">
                                <h2>{selectedCustomer.name}</h2>
                                <span className={`badge ${selectedCustomer.balance > 0 ? "badge-danger" : "badge-success"}`}>
                                    {selectedCustomer.balance > 0 ? "مدين" : "رصيد مكتمل"}
                                </span>
                            </div>
                        </div>

                        <div className="details-section">
                            <div className="info-grid">
                                <div className="info-item">
                                    <Icon name="user" className="info-icon" />
                                    <div className="info-content">
                                        <label>رقم الهاتف</label>
                                        <span>{selectedCustomer.phone || "غير متوفر"}</span>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <Icon name="check" className="info-icon" />
                                    <div className="info-content">
                                        <label>الرقم الضريبي</label>
                                        <span>{selectedCustomer.tax_number || "غير متوفر"}</span>
                                    </div>
                                </div>
                                <div className="info-item full-width">
                                    <Icon name="home" className="info-icon" />
                                    <div className="info-content">
                                        <label>العنوان</label>
                                        <span>{selectedCustomer.address || "بدون عنوان مسجل"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-stats compact" style={{ padding: 0, marginTop: "1.5rem" }}>
                            <div className="stat-card">
                                <div className="stat-icon alert">{getIcon("dollar")}</div>
                                <div className="stat-info">
                                    <h3>المبيعات (مدين)</h3>
                                    <p className="text-danger">{formatCurrency(selectedCustomer.total_debt)}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon products">{getIcon("check")}</div>
                                <div className="stat-info">
                                    <h3>المدفوعات (دائن)</h3>
                                    <p className="text-success">{formatCurrency(selectedCustomer.total_paid)}</p>
                                </div>
                            </div>
                            <div className="stat-card highlighted">
                                <div className="stat-icon total">{getIcon("building")}</div>
                                <div className="stat-info">
                                    <h3>الرصيد المستحق</h3>
                                    <p className={selectedCustomer.balance > 0 ? "text-danger" : "text-success"}>
                                        {formatCurrency(selectedCustomer.balance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="dialog-actions-alt mt-6" style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                variant="primary"
                                icon="clipboard-list"
                                onClick={() => router.push(`/finance/ar_ledger?customer_id=${selectedCustomer.id}`)}
                            >
                                عرض كشف الحساب الكامل
                            </Button>
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
        </ModuleLayout>
    );
}
