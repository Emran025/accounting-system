"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { ConfirmDialog, showToast, showAlert, Button, SalesReturnDialog, SelectedItem, SelectableInvoiceItem } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { parseNumber } from "@/lib/utils";
import { User, getStoredUser, checkAuth } from "@/lib/auth";

import { LedgerTransaction, LedgerStats, Representative, DetailedInvoice } from "./types";
import { RepresentativeInfoSection } from "./components/RepresentativeInfoSection";
import { LedgerStatsCards } from "./components/LedgerStatsCards";
import { LedgerTable } from "./components/LedgerTable";
import { LedgerFilterDialog } from "./components/LedgerFilterDialog";
import { TransactionFormDialog } from "./components/TransactionFormDialog";
import { InvoiceDetailsDialog } from "./components/InvoiceDetailsDialog";

function LedgerPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const representativeId = searchParams.get("sales_representative_id");

    const [user, setUser] = useState<User | null>(null);
    const [representative, setRepresentative] = useState<Representative | null>(null);
    const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
    const [stats, setStats] = useState<LedgerStats>({
        total_commissions: 0,
        total_payments: 0,
        total_returns: 0,
        balance: 0,
        transaction_count: 0,
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleted, setShowDeleted] = useState(false);

    const [filters, setFilters] = useState({
        search: "",
        type: "",
        date_from: "",
        date_to: "",
    });

    const [filterDialog, setFilterDialog] = useState(false);
    const [transactionDialog, setTransactionDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [viewInvoiceDialog, setViewInvoiceDialog] = useState(false);
    const [returnDialog, setReturnDialog] = useState(false);

    const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<DetailedInvoice | null>(null);
    const [selectedReturnItems, setSelectedReturnItems] = useState<SelectedItem[]>([]);

    const [transactionType, setTransactionType] = useState<"payment" | "adjustment">("payment");
    const [transactionAmount, setTransactionAmount] = useState("");
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
    const [transactionDescription, setTransactionDescription] = useState("");
    const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);

    const itemsPerPage = 20;

    useEffect(() => {
        if (!representativeId) {
            router.push("/sales/representatives");
            return;
        }
    }, [representativeId, router]);

    const loadLedger = useCallback(async (page: number = 1) => {
        if (!representativeId) return;

        try {
            setIsLoading(true);
            let params = `sales_representative_id=${representativeId}&page=${page}&per_page=${itemsPerPage}`;
            if (showDeleted) params += `&show_deleted=1`;
            if (filters.search) params += `&search=${encodeURIComponent(filters.search)}`;
            if (filters.type) params += `&type=${filters.type}`;
            if (filters.date_from) params += `&date_from=${filters.date_from}`;
            if (filters.date_to) params += `&date_to=${filters.date_to}`;

            const response = await fetchAPI(`${API_ENDPOINTS.SALES.REPRESENTATIVES.LEDGER}?${params}`);
            if (response.success && response.data) {
                const dataObj = (response as any).data;
                setTransactions(dataObj.data || []);
                if (dataObj.stats) setStats(dataObj.stats);
                if (dataObj.representative) setRepresentative(dataObj.representative);
                if (dataObj.pagination) setTotalPages(dataObj.pagination.total_pages);
                setCurrentPage(page);
            } else {
                showAlert("alert-container", response.message || "فشل تحميل العمليات", "error");
            }
        } catch {
            showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
        } finally {
            setIsLoading(false);
        }
    }, [representativeId, showDeleted, filters]);

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated || !authenticated.isAuthenticated) return;
            setUser(getStoredUser());
            await loadLedger();
        };
        init();
    }, [loadLedger]);

    const openAddTransactionDialog = () => {
        setEditingTransactionId(null);
        setTransactionType("payment");
        setTransactionAmount("");
        setTransactionDate(new Date().toISOString().split("T")[0]);
        setTransactionDescription("");
        setTransactionDialog(true);
    };

    const editTransaction = (transaction: LedgerTransaction) => {
        if (transaction.type !== "payment" && transaction.type !== "adjustment") {
            showToast("لا يمكن تعديل هذا النوع من العمليات", "error");
            return;
        }

        setEditingTransactionId(transaction.id);
        setTransactionType(transaction.type);
        setTransactionAmount(String(Math.abs(transaction.amount)));
        setTransactionDate(transaction.transaction_date.split("T")[0]);
        setTransactionDescription(transaction.description || "");
        setTransactionDialog(true);
    };

    const saveTransaction = async () => {
        if (!transactionAmount || parseNumber(transactionAmount) <= 0) {
            showToast("المبلغ مطلوب ويجب أن يكون أكبر من صفر", "error");
            return;
        }

        try {
            const isNegative = transactionType === "payment" || (transactionType === "adjustment" && parseNumber(transactionAmount) < 0);

            const data: any = {
                sales_representative_id: representativeId,
                type: transactionType,
                amount: parseNumber(transactionAmount),
                date: transactionDate,
                description: transactionDescription,
            };

            let response;
            if (editingTransactionId) {
                data.id = editingTransactionId;
                response = await fetchAPI(`${API_ENDPOINTS.SALES.REPRESENTATIVES.TRANSACTIONS}/${editingTransactionId}`, {
                    method: "PUT",
                    body: JSON.stringify(data),
                });
            } else {
                response = await fetchAPI(API_ENDPOINTS.SALES.REPRESENTATIVES.TRANSACTIONS, {
                    method: "POST",
                    body: JSON.stringify(data),
                });
            }

            if (response.success) {
                showToast("تم الحفظ بنجاح", "success");
                setTransactionDialog(false);
                await loadLedger(currentPage);
            } else {
                showToast(response.message || "خطأ", "error");
            }
        } catch {
            showToast("خطأ في الحفظ", "error");
        }
    };

    const confirmDeleteTransaction = (id: number) => {
        setDeleteTransactionId(id);
        setConfirmDialog(true);
    };

    const deleteTransaction = async () => {
        if (!deleteTransactionId) return;

        try {
            const response = await fetchAPI(API_ENDPOINTS.SALES.REPRESENTATIVES.TRANSACTIONS, {
                method: "DELETE",
                body: JSON.stringify({ id: deleteTransactionId })
            });

            if (response.success) {
                showToast("تم الحذف بنجاح", "success");
                setConfirmDialog(false);
                setDeleteTransactionId(null);
                await loadLedger(currentPage);
            } else {
                showToast(response.message || "خطأ", "error");
            }
        } catch {
            showToast("خطأ في الحذف", "error");
        }
    };

    const restoreTransaction = async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.SALES.REPRESENTATIVES.TRANSACTIONS}/${id}/restore`, {
                method: "POST",
            });

            if (response.success) {
                showToast("تم الاستعادة بنجاح", "success");
                await loadLedger(currentPage);
            } else {
                showToast(response.message || "خطأ", "error");
            }
        } catch {
            showToast("خطأ في الاستعادة", "error");
        }
    };

    const viewInvoice = async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICES}/${id}`);
            if (response.success && response.data) {
                setSelectedInvoice(response.data as DetailedInvoice);
                setViewInvoiceDialog(true);
            } else {
                showToast("حدث خطأ أثناء جلب تفاصيل الفاتورة", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("حدث خطأ بالاتصال", "error");
        }
    };

    const fetchInvoiceItems = async (transaction: LedgerTransaction): Promise<SelectableInvoiceItem[]> => {
        if (!transaction.reference_id || transaction.reference_type !== "invoices") {
            return [];
        }
        try {
            const res = await fetchAPI(`${API_ENDPOINTS.SALES.INVOICES}/${transaction.reference_id}`);
            if (res.success && res.data) {
                return (res.data as any).items.map((item: any) => ({
                    id: item.id || Math.random(),
                    product_id: item.product_id,
                    display_name: item.product_name,
                    quantity: item.quantity,
                    original_quantity: item.original_quantity || item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal,
                }));
            }
            return [];
        } catch (error) {
            console.error("Failed fetching invoice items:", error);
            return [];
        }
    };


    if (!representativeId) return null;

    return (
        <ModuleLayout groupKey="finance" requiredModule="finance">
            <PageHeader
                title="كشف حساب المندوب"
                user={user}
                actions={
                    <>
                        <Button variant="secondary" icon="filter" onClick={() => setFilterDialog(true)}>
                            تصفية
                        </Button>
                        <Button variant="primary" icon="plus" onClick={openAddTransactionDialog}>
                            سند قبض / تسوية
                        </Button>
                    </>
                }
            />

            <div id="alert-container"></div>

            <RepresentativeInfoSection
                representative={representative}
                showDeleted={showDeleted}
                onShowDeletedChange={setShowDeleted}
            />

            <LedgerStatsCards stats={stats} />

            <div className="table-controls mb-4 flex gap-4">
                <input
                    type="text"
                    placeholder="بحث برقم المرجع أو الوصف..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onBlur={() => loadLedger(1)}
                    onKeyDown={(e) => e.key === 'Enter' && loadLedger(1)}
                    className="form-control"
                    style={{ maxWidth: '300px' }}
                />
            </div>

            <LedgerTable
                transactions={transactions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                handleReturnSelection={setSelectedReturnItems}
                setSearch={(query: string) => {
                    setFilters({ ...filters, search: query });
                    loadLedger(1);
                }}
                onPageChange={loadLedger}
                getInvoiceItems={fetchInvoiceItems}
                openReturnDialog={() => setReturnDialog(true)}
                onViewInvoice={viewInvoice}
                onEditTransaction={editTransaction}
                onDeleteTransaction={confirmDeleteTransaction}
                onRestoreTransaction={restoreTransaction}
            />

            <TransactionFormDialog
                isOpen={transactionDialog}
                onClose={() => setTransactionDialog(false)}
                isCustomId={!!editingTransactionId}
                transactionType={transactionType}
                transactionAmount={transactionAmount}
                transactionDate={transactionDate}
                transactionDescription={transactionDescription}
                setTransactionType={setTransactionType}
                setTransactionAmount={setTransactionAmount}
                setTransactionDate={setTransactionDate}
                setTransactionDescription={setTransactionDescription}
                onSave={saveTransaction}
            />

            <LedgerFilterDialog
                isOpen={filterDialog}
                onClose={() => setFilterDialog(false)}
                filters={filters}
                setFilters={setFilters}
                onApply={() => {
                    setFilterDialog(false);
                    loadLedger(1);
                }}
            />

            <InvoiceDetailsDialog
                isOpen={viewInvoiceDialog}
                onClose={() => setViewInvoiceDialog(false)}
                selectedInvoice={selectedInvoice}
            />

            <SalesReturnDialog
                isOpen={returnDialog}
                onClose={() => setReturnDialog(false)}
                selectedItems={selectedReturnItems}
                invoicesMap={{}}
                onConfirmReturn={async () => { }}
                onSuccess={() => {
                    setReturnDialog(false);
                    setSelectedReturnItems([]);
                    loadLedger(currentPage);
                }}
            />

            <ConfirmDialog
                isOpen={confirmDialog}
                onClose={() => setConfirmDialog(false)}
                onConfirm={deleteTransaction}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذه العملية؟ سيؤثر هذا على رصيد المندوب."
                confirmVariant="danger"
            />
        </ModuleLayout>
    );
}

export default function LedgerPage() {
    return (
        <Suspense fallback={<div className="p-4 text-center">جاري التحميل...</div>}>
            <LedgerPageContent />
        </Suspense>
    );
}
