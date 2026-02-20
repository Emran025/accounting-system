"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { Table, ConfirmDialog, showToast, Column, SearchableSelect, Button, SelectOption, showAlert } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, getStoredUser, checkAuth } from "@/lib/auth";
import { getIcon } from "@/lib/icons";

interface Customer {
    id: number;
    name: string;
    current_balance: number;
}

interface Receipt {
    id: number;
    customer_id: number;
    type: string;
    amount: number;
    description: string;
    transaction_date: string;
    customer?: Customer;
}

export default function ReceiptsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // List
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Form
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete dialog
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const itemsPerPage = 20;

    const loadReceipts = useCallback(async (page: number = 1, search: string = "") => {
        try {
            setIsLoading(true);
            const response = (await fetchAPI(
                `${API_ENDPOINTS.FINANCE.AR.RECEIPTS}?page=${page}&per_page=${itemsPerPage}&search=${encodeURIComponent(search)}`
            )) as any;

            if (response.success && response.data) {
                setReceipts((response.data as Receipt[]) || []);
                const pagination = response.pagination;
                if (pagination) {
                    setTotalPages(pagination.total_pages || 1);
                    setCurrentPage(pagination.current_page || 1);
                }
            }
        } catch {
            showToast("خطأ في تحميل السندات", "error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadCustomers = useCallback(async () => {
        try {
            const response = (await fetchAPI(`${API_ENDPOINTS.FINANCE.AR.CUSTOMERS}?per_page=1000`)) as any;
            if (response.success && response.data) {
                setCustomers((response.data as Customer[]) || []);
            }
        } catch (error) {
            console.error("Failed to load customers", error);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;

            setUser(getStoredUser());
            await Promise.all([loadCustomers(), loadReceipts(1)]);
        };
        init();
    }, [loadCustomers, loadReceipts]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        loadReceipts(1, value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer) {
            showAlert("alert-container", "يرجى اختيار العميل", "error");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            showAlert("alert-container", "المبلغ غير صحيح", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetchAPI(API_ENDPOINTS.FINANCE.AR.TRANSACTIONS, {
                method: "POST",
                body: JSON.stringify({
                    customer_id: selectedCustomer.id,
                    type: "receipt",
                    amount: numAmount,
                    date: date,
                    description: description,
                }),
            });

            if (response.success) {
                showAlert("alert-container", "تمت إضافة السند بنجاح", "success");

                // Reset form
                setSelectedCustomer(null);
                setAmount("");
                setDescription("");
                setDate(new Date().toISOString().split("T")[0]);

                // Reload data
                await Promise.all([loadCustomers(), loadReceipts(1, searchTerm)]);
            } else {
                showAlert("alert-container", response.message || "فشل حفظ السند", "error");
            }
        } catch {
            showAlert("alert-container", "خطأ في حفظ السند", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (id: number) => {
        setDeleteId(id);
        setConfirmDialog(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await fetchAPI(`${API_ENDPOINTS.FINANCE.AR.TRANSACTIONS}?id=${deleteId}`, {
                method: "DELETE"
            });
            if (response.success) {
                showToast("تم حذف السند بنجاح", "success");
                loadReceipts(currentPage, searchTerm);
            } else {
                showToast(response.message || "فشل الحذف", "error");
            }
        } catch {
            showToast("خطأ في حذف السند", "error");
        } finally {
            setConfirmDialog(false);
            setDeleteId(null);
        }
    };

    const customerOptions: SelectOption[] = customers.map((c) => ({
        value: c.id,
        label: c.name,
        subtitle: `الرصيد: ${formatCurrency(c.current_balance)}`,
        original: c,
    }));

    const columns: Column<Receipt>[] = [
        {
            key: "customer_name",
            header: "العميل",
            dataLabel: "العميل",
            render: (item) => item.customer?.name || "غير معروف",
        },
        {
            key: "amount",
            header: "المبلغ",
            dataLabel: "المبلغ",
            render: (item) => <span className="text-success fw-bold">{formatCurrency(item.amount)}</span>,
        },
        {
            key: "transaction_date",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => formatDate(item.transaction_date),
        },
        {
            key: "description",
            header: "البيان / الوصف",
            dataLabel: "البيان / الوصف",
            render: (item) => item.description || "-",
        },
        {
            key: "actions",
            header: "الإجراءات",
            dataLabel: "الإجراءات",
            render: (item) => (
                <div className="action-buttons">
                    <button className="icon-btn delete" onClick={() => confirmDelete(item.id)} title="حذف">
                        {getIcon("trash")}
                    </button>
                </div>
            ),
        },
    ];

    return (
        <ModuleLayout groupKey="sales" requiredModule="ar_customers">
            <PageHeader title="سندات القبض المباشرة" user={user} />
            <div id="alert-container"></div>

            <div className="sales-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Form Card (Match Sales / Sales structure) */}
                <div className="sales-card compact animate-slide">
                    <div className="card-header-flex">
                        <h3>تسجيل سند قبض جديد</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="sales-form-grid">
                        <div className="form-group">
                            <label>العميل *</label>
                            <SearchableSelect
                                options={customerOptions}
                                value={selectedCustomer ? selectedCustomer.id : null}
                                onChange={(val, opt) => setSelectedCustomer(opt ? (opt.original as Customer) : null)}
                                placeholder="ابحث عن عميل..."
                            />
                            {selectedCustomer && (
                                <small className="text-muted mt-1 d-block">
                                    الرصيد الحالي: <span dir="ltr">{formatCurrency(selectedCustomer.current_balance)}</span>
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>المبلغ *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="styled-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>التاريخ *</label>
                            <input
                                type="date"
                                className="styled-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>البيان / الوصف</label>
                            <input
                                type="text"
                                className="styled-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="مثال: دفعة من الحساب"
                            />
                        </div>

                        <div className="form-actions" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <Button
                                variant="primary"
                                icon="check"
                                type="submit"
                                disabled={isSubmitting || !selectedCustomer || !amount}
                            >
                                {isSubmitting ? "جاري الحفظ..." : "حفظ السند"}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Table Card */}
                <div className="sales-card animate-fade">
                    <div className="card-header-flex" style={{ marginBottom: '15px' }}>
                        <h3>سجل المقبوضات</h3>
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="بحث عن سند..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="styled-input"
                            />
                            <span className="search-icon">{getIcon("search")}</span>
                        </div>
                    </div>

                    <Table
                        columns={columns}
                        data={receipts}
                        keyExtractor={(item) => item.id}
                        emptyMessage="لا توجد سندات قبض"
                        isLoading={isLoading}
                        pagination={{
                            currentPage,
                            totalPages,
                            onPageChange: (page) => loadReceipts(page, searchTerm),
                        }}
                    />
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => setConfirmDialog(false)}
                onConfirm={handleDelete}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذا السند؟ سيتم تحديث رصيد العميل."
                confirmText="حذف السند"
                confirmVariant="danger"
            />
        </ModuleLayout>
    );
}
