"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import {
    showAlert,
    showToast,
    Button,
    SelectableInvoiceItem,
    PurchaseReturnDialog,
    SelectedItem,
    SelectableInvoice,
    ReturnData,
} from "@/components/ui";

import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { User, getStoredUser, checkAuth } from "@/lib/auth";
import { TabSubNavigation } from "@/components/navigation/TabNavigation";

import { ReturnsStatsCards, ReturnsStats } from "./components/ReturnsStatsCards";
import { ReturnsTable } from "./components/ReturnsTable";
import { ReturnsFilterDialog } from "./components/ReturnsFilterDialog";
import { InvoiceSelectionTab } from "./components/InvoiceSelectionTab";
import { InvoiceDetailsDialog } from "../../finance/ap_ledger/components/InvoiceDetailsDialog";
import { LedgerTransaction, Pagination, DetailedInvoice } from "../../finance/ap_ledger/types";

/** Top-level page tabs */
const PAGE_TABS = [
    { key: "records", label: "سجل المرتجعات", icon: "list" },
    { key: "new-return", label: "إضافة مرتجع", icon: "plus" },
];

function ReturnsPageContent() {
    const [user, setUser] = useState<User | null>(null);
    const [activePage, setActivePage] = useState<"records" | "new-return">("records");

    /* ── Returns ledger ── */
    const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
    const [stats, setStats] = useState<ReturnsStats>({
        total_returns: 0,
        total_cash_returns: 0,
        total_credit_returns: 0,
        transaction_count: 0,
    });
    const [pagination, setPagination] = useState<Pagination>({ total_records: 0, total_pages: 0, current_page: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    /* ── Filters ── */
    const [filters, setFilters] = useState({ search: "", type: "", date_from: "", date_to: "" });

    /* ── Dialogs ── */
    const [filterDialog, setFilterDialog] = useState(false);
    const [viewDialog, setViewDialog] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<DetailedInvoice | null>(null);

    /* ── Return creation ── */
    const [selectedReturnItems, setSelectedReturnItems] = useState<SelectedItem[]>([]);
    const [returnDialog, setReturnDialog] = useState(false);
    const [invoicesMap, setInvoicesMap] = useState<Record<number, SelectableInvoice>>({});
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

    const itemsPerPage = 20;

    /* ──────────────────────────────────────────────
       Load returns ledger
    ────────────────────────────────────────────── */
    const loadReturns = useCallback(
        async (page: number = 1) => {
            try {
                setIsLoading(true);
                const offset = (page - 1) * itemsPerPage;
                let params = `limit=${itemsPerPage}&offset=${offset}&page=${page}`;
                // Using ap/transactions endpoint and filtering by return type on the backend or fetching all AP ledgers.
                // Assuming we can use API_ENDPOINTS.PURCHASES.SUPPLIERS.TRANSACTIONS filtered by type
                if (filters.search) params += `&search=${encodeURIComponent(filters.search)}`;
                params += `&type=return`; // Enforce returns only if backend supports it; else we filter below.
                if (filters.date_from) params += `&date_from=${filters.date_from}`;
                if (filters.date_to) params += `&date_to=${filters.date_to}`;

                // Purchase Returns Ledger Endpoint
                const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.RETURNS.LEDGER}?${params}`);
                if (response.success && response.data) {
                    // Filter locally if backend doesn't filter perfectly by type=return
                    const allTrans = response.data as any[];
                    const returnsOnly = allTrans.filter(t => t.type === 'return');

                    const mapped: LedgerTransaction[] = returnsOnly.map((item) => ({
                        ...item,
                        type: "return" as const,
                        invoice_number: item.invoice_number || `RTN-${item.id}`,
                        total_amount: item.amount,
                        subtotal: item.subtotal ?? item.amount,
                        vat_amount: item.vat_amount ?? 0,
                        discount_amount: item.discount_amount ?? 0,
                        payment_type: item.payment_type ?? "cash",
                        created_at: item.transaction_date,
                    }));
                    setTransactions(mapped);

                    if (response.stats) setStats(response.stats as ReturnsStats);
                    if (response.pagination) {
                        const pag = response.pagination as Pagination;
                        setPagination(pag);
                        setTotalPages(Number(pag.total_pages) || 1);
                    }
                    setCurrentPage(page);
                } else {
                    showAlert("alert-container", response.message || "فشل تحميل المرتجعات", "error");
                }
            } catch {
                showAlert("alert-container", "خطأ في الاتصال بالسيرفر", "error");
            } finally {
                setIsLoading(false);
            }
        },
        [filters]
    );

    useEffect(() => {
        const init = async () => {
            const authenticated = await checkAuth();
            if (!authenticated) return;
            setUser(getStoredUser());
            await loadReturns();
        };
        init();
    }, [loadReturns]);

    /* ──────────────────────────────────────────────
       View original invoice details
    ────────────────────────────────────────────── */
    const viewInvoice = async (id: number) => {
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.RETURNS.SHOW}?id=${id}`);
            if (response.success && response.data) {
                setSelectedInvoice(response.data as DetailedInvoice);
                setViewDialog(true);
            }
        } catch {
            showAlert("alert-container", "خطأ في جلب تفاصيل الفاتورة", "error");
        }
    };

    /** Fetch return items for the expandable row in the ledger tab */
    const getReturnItems = async (item: LedgerTransaction): Promise<SelectableInvoiceItem[]> => {
        if (!item.reference_id) return [];
        try {
            const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.RETURNS.SHOW}?id=${item.reference_id}`);
            if (response.success && response.data) {
                return ((response.data as DetailedInvoice).items as SelectableInvoiceItem[]) || [];
            }
            return [];
        } catch {
            return [];
        }
    };

    /* ──────────────────────────────────────────────
       Return creation handlers
    ────────────────────────────────────────────── */
    const handleReturnSelection = useCallback((items: SelectedItem[]) => {
        setSelectedReturnItems(items);
    }, []);

    const openReturnDialog = async () => {
        if (selectedReturnItems.length === 0) {
            showToast("يرجى تحديد عناصر للإرجاع أولاً", "warning");
            return;
        }

        const uniqueInvoiceIds = Array.from(new Set(selectedReturnItems.map((i) => i.invoiceId)));
        const missingIds = uniqueInvoiceIds.filter((id) => !invoicesMap[id]);

        if (missingIds.length > 0) {
            setIsLoadingInvoices(true);
            try {
                const newMap = { ...invoicesMap };
                await Promise.all(
                    missingIds.map(async (id) => {
                        const res = await fetchAPI(`${API_ENDPOINTS.PURCHASES.RETURNS.SHOW}?id=${id}`);
                        if (res.success && res.data) newMap[id] = res.data as SelectableInvoice;
                    })
                );
                setInvoicesMap(newMap);
            } catch {
                showToast("فشل تحميل بيانات الفواتير", "error");
            } finally {
                setIsLoadingInvoices(false);
            }
        }

        setReturnDialog(true);
    };

    const handleConfirmReturn = async (data: ReturnData | ReturnData[]) => {
        const dataArray = Array.isArray(data) ? data : [data];
        for (const returnData of dataArray) {
            const payload = {
                type: "return",
                ...returnData
            };
            const response = await fetchAPI(API_ENDPOINTS.PURCHASES.BASE, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            if (!response.success) {
                throw new Error(response.message || "فشل تسجيل المرتجع");
            }
        }
        showToast("تم تسجيل المرتجع بنجاح", "success");
    };

    const applyFilters = () => {
        setFilterDialog(false);
        loadReturns(1);
    };

    /* ──────────────────────────────────────────────
       Render
    ────────────────────────────────────────────── */
    return (
        <ModuleLayout groupKey="purchases" requiredModule="purchases">
            <PageHeader
                title="مرتجعات المشتريات"
                user={user}

                actions={
                    <>
                        {
                            (<TabSubNavigation
                                tabs={PAGE_TABS}
                                activeTab={activePage}
                                onTabChange={(key) => setActivePage(key as "records" | "new-return")}
                            />)
                        }
                        {(
                            <Button
                                variant="primary"
                                icon="search"
                                onClick={() => setFilterDialog(true)}
                            >
                                تصفية
                            </Button>
                        )}
                    </>
                }
            />

            {/* ── Tab: سجل المرتجعات ── */}
            {activePage === "records" && (
                <>
                    <ReturnsStatsCards stats={stats} />
                    <div id="alert-container" />
                    <ReturnsTable
                        transactions={transactions}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        setSearch={(query: string) => setFilters({ ...filters, search: query })}
                        onPageChange={loadReturns}
                        getInvoiceItems={getReturnItems}
                        onViewInvoice={viewInvoice}
                    />
                </>
            )}

            {/* ── Tab: إضافة مرتجع ── */}
            {activePage === "new-return" && (
                <InvoiceSelectionTab
                    onSelectionChange={handleReturnSelection}
                    openReturnDialog={openReturnDialog}
                />
            )}

            {/* ── Shared dialogs ── */}
            <ReturnsFilterDialog
                isOpen={filterDialog}
                onClose={() => setFilterDialog(false)}
                filters={filters}
                setFilters={setFilters}
                onApply={applyFilters}
            />

            <InvoiceDetailsDialog
                isOpen={viewDialog}
                onClose={() => setViewDialog(false)}
                selectedInvoice={selectedInvoice}
            />

            {/* Purchase Return Dialog */}
            <PurchaseReturnDialog
                isOpen={returnDialog}
                onClose={() => setReturnDialog(false)}
                selectedItems={selectedReturnItems}
                invoicesMap={invoicesMap}
                onConfirmReturn={handleConfirmReturn}
                onSuccess={() => {
                    setReturnDialog(false);
                    setSelectedReturnItems([]);
                    // Switch to records tab and refresh
                    setActivePage("records");
                    loadReturns(1);
                }}
            />
        </ModuleLayout>
    );
}

export default function PurchaseReturnsPage() {
    return (
        <Suspense fallback={<div className="p-4 text-center">جاري التحميل...</div>}>
            <ReturnsPageContent />
        </Suspense>
    );
}
