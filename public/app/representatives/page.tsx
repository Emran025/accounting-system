"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { Table, Dialog, ConfirmDialog, showToast, Column, Button, ActionButtons } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { User, getStoredUser, getStoredPermissions, Permission, canAccess, checkAuth } from "@/lib/auth";
import { Icon, getIcon } from "@/lib/icons";
import { SalesRepresentative } from "./types";
import { useSalesRepresentativeStore } from "@/stores/useSalesRepresentativeStore";

export default function SalesRepresentativesPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const {
        items: representatives,
        currentPage,
        totalPages,
        isLoading,
        load: loadRepresentatives,
        save: saveRepresentative,
        remove: deleteRepresentative,
    } = useSalesRepresentativeStore();

    // Dialogs
    const [formDialog, setFormDialog] = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [selectedRepresentative, setSelectedRepresentative] = useState<SalesRepresentative | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Form
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;
            setUser(getStoredUser());
            setPermissions(getStoredPermissions());
            loadRepresentatives();
        };
        init();
    }, [loadRepresentatives]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        loadRepresentatives(1, value);
    };

    const openAddDialog = () => {
        setSelectedRepresentative(null);
        setFormData({ name: "", phone: "", email: "", address: "" });
        setFormDialog(true);
    };

    const openEditDialog = (r: SalesRepresentative) => {
        setSelectedRepresentative(r);
        setFormData({
            name: r.name,
            phone: r.phone || "",
            email: r.email || "",
            address: r.address || "",
        });
        setFormDialog(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast("يرجى إدخال اسم المندوب", "error");
            return;
        }

        const success = await saveRepresentative(formData, selectedRepresentative?.id);
        if (success) {
            setFormDialog(false);
            loadRepresentatives(currentPage, searchTerm);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const success = await deleteRepresentative(deleteId);
        if (success) {
            setConfirmDialog(false);
        }
    };

    const columns: Column<SalesRepresentative>[] = [
        { key: "name", header: "اسم المندوب", dataLabel: "اسم المندوب" },
        { key: "phone", header: "الهاتف", dataLabel: "الهاتف" },
        {
            key: "total_sales",
            header: "إجمالي العمولات / المبيعات",
            dataLabel: "إجمالي العمولات",
            render: (it) => formatCurrency(it.total_sales)
        },
        {
            key: "total_paid",
            header: "المدفوع",
            dataLabel: "المدفوع",
            render: (it) => <span className="text-success">{formatCurrency(it.total_paid)}</span>
        },
        {
            key: "current_balance",
            header: "الرصيد المتبقي",
            dataLabel: "الرصيد المتبقي",
            render: (it) => (
                <span className={it.current_balance > 0 ? "text-danger strong" : "text-success"}>
                    {formatCurrency(it.current_balance)}
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
                            onClick: () => { router.push(`/finance/representatives_ledger?sales_representative_id=${it.id}`); }
                        },
                        {
                            icon: "eye",
                            title: "تفاصيل",
                            variant: "info",
                            onClick: () => { setSelectedRepresentative(it); setViewDialog(true); },
                        },
                        {
                            icon: "edit",
                            title: "تعديل",
                            variant: "edit",
                            onClick: () => { openEditDialog(it) },
                            hidden: !canAccess(permissions, "representatives", "edit")
                        },
                        {
                            icon: "trash",
                            title: "حذف",
                            variant: "delete",
                            onClick: () => { setDeleteId(it.id); setConfirmDialog(true); },
                            hidden: !canAccess(permissions, "representatives", "delete")
                        }
                    ]}
                />
            ),
        }
    ];

    return (
        <ModuleLayout groupKey="sales" requiredModule="representatives">
            <PageHeader
                title="مناديب المبيعات / التسويق"
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
                    canAccess(permissions, "representatives", "create") && (
                        <Button variant="primary" icon="plus" onClick={openAddDialog}>
                            إضافة مندوب
                        </Button>
                    )
                }
            />

            <div className="sales-card animate-fade">
                <Table
                    columns={columns}
                    data={representatives}
                    keyExtractor={(it) => it.id}
                    isLoading={isLoading}
                    pagination={{
                        currentPage,
                        totalPages,
                        onPageChange: (page) => loadRepresentatives(page, searchTerm)
                    }}
                />
            </div>

            {/* Form Dialog */}
            <Dialog
                isOpen={formDialog}
                onClose={() => setFormDialog(false)}
                title={selectedRepresentative ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}
                maxWidth="600px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setFormDialog(false)}>إلغاء</Button>
                        <Button variant="primary" onClick={handleSubmit}>{selectedRepresentative ? "تحديث" : "إضافة"}</Button>
                    </>
                }
            >
                <div className="form-group">
                    <label>اسم المندوب *</label>
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
                    <label>العنوان</label>
                    <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} />
                </div>
            </Dialog>

            {/* View Dialog */}
            <Dialog
                isOpen={viewDialog}
                onClose={() => setViewDialog(false)}
                title="ملف المندوب"
                maxWidth="600px"
            >
                {selectedRepresentative && (
                    <div className="customer-profile-view">
                        <div className="profile-header">
                            <div className="profile-avatar">
                                <Icon name="user" size={32} />
                            </div>
                            <div className="profile-info">
                                <h2>{selectedRepresentative.name}</h2>
                                <span className={`badge ${selectedRepresentative.current_balance > 0 ? "badge-danger" : "badge-success"}`}>
                                    {selectedRepresentative.current_balance > 0 ? "يستحق عمولة" : "لا يوجد مستحقات"}
                                </span>
                            </div>
                        </div>

                        <div className="details-section">
                            <div className="info-grid">
                                <div className="info-item">
                                    <Icon name="user" className="info-icon" />
                                    <div className="info-content">
                                        <label>رقم الهاتف</label>
                                        <span>{selectedRepresentative.phone || "غير متوفر"}</span>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <Icon name="check" className="info-icon" />
                                    <div className="info-content">
                                        <label>البريد الإلكتروني</label>
                                        <span>{selectedRepresentative.email || "غير متوفر"}</span>
                                    </div>
                                </div>
                                <div className="info-item full-width">
                                    <Icon name="home" className="info-icon" />
                                    <div className="info-content">
                                        <label>العنوان</label>
                                        <span>{selectedRepresentative.address || "بدون عنوان مسجل"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-stats compact" style={{ padding: 0, marginTop: "1.5rem" }}>
                            <div className="stat-card">
                                <div className="stat-icon alert">{getIcon("dollar")}</div>
                                <div className="stat-info">
                                    <h3>إجمالي العمولات</h3>
                                    <p className="text-danger">{formatCurrency(selectedRepresentative.total_sales)}</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon products">{getIcon("check")}</div>
                                <div className="stat-info">
                                    <h3>المدفوعات</h3>
                                    <p className="text-success">{formatCurrency(selectedRepresentative.total_paid)}</p>
                                </div>
                            </div>
                            <div className="stat-card highlighted">
                                <div className="stat-icon total">{getIcon("building")}</div>
                                <div className="stat-info">
                                    <h3>المستحق للمندوب</h3>
                                    <p className={selectedRepresentative.current_balance > 0 ? "text-danger" : "text-success"}>
                                        {formatCurrency(selectedRepresentative.current_balance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="dialog-actions-alt mt-6" style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                            <Button
                                variant="primary"
                                icon="clipboard-list"
                                onClick={() => router.push(`/finance/representatives_ledger?sales_representative_id=${selectedRepresentative.id}`)}
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
                message="هل أنت متأكد من حذف هذا المندوب؟"
            />
        </ModuleLayout>
    );
}
