"use client";

import { useState, useEffect, useCallback } from "react";
import {
    SelectableInvoiceTable,
    SelectedItem,
    SelectableInvoiceItem,
    InvoiceTableColumn,
} from "@/components/ui";
import { TabSubNavigation } from "@/components/navigation/TabNavigation";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { formatCurrency, formatDateTime } from "@/lib/utils";

/** Minimal invoice row – matches the /purchases API response */
export interface InvoiceRow {
    id: number;
    invoice_number: string;
    voucher_number?: string;
    total_amount: number;
    invoice_price?: number;
    subtotal: number;
    vat_amount: number;
    discount_amount: number;
    payment_type: string;
    supplier?: { id: number; name: string };
    supplier_name?: string;
    items?: SelectableInvoiceItem[];
    items_count?: number;
    created_at: string;
    purchase_date?: string;
}

interface InvoiceSelectionTabProps {
    onSelectionChange: (items: SelectedItem[]) => void;
    openReturnDialog: () => void;
}

export function InvoiceSelectionTab({
    onSelectionChange,
    openReturnDialog,
}: InvoiceSelectionTabProps) {
    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeFilter, setActiveFilter] = useState("all");
    const itemsPerPage = 20;

    const filterTabs = [
        { key: "all", label: "جميع الفواتير", icon: "list" },
    ];

    const loadInvoices = useCallback(
        async (page: number = 1, search: string = "", paymentType: string = activeFilter) => {
            try {
                setIsLoading(true);
                const offset = (page - 1) * itemsPerPage;
                let params = `limit=${itemsPerPage}&offset=${offset}&page=${page}`;
                if (search) params += `&search=${encodeURIComponent(search)}`;
                // For Purchases, we don't naturally filter by payment_type via base URL but keeping it robust

                const response = await fetchAPI(`${API_ENDPOINTS.PURCHASES.BASE}?${params}`);
                if (response.success && response.data) {
                    const mapped = (response.data as any[]).map(item => ({
                        ...item,
                        invoice_number: item.voucher_number || item.invoice_number || `#${item.id}`,
                        total_amount: item.invoice_price || item.total_amount || 0,
                        payment_type: item.payment_type || "cash",
                        supplier_name: item.supplier?.name || item.supplier_name,
                        created_at: item.purchase_date || item.created_at,
                    }));
                    setInvoices(mapped as InvoiceRow[]);
                    if (response.pagination) {
                        const pag = response.pagination as any;
                        setTotalPages(Number(pag.total_pages) || 1);
                    }
                    setCurrentPage(page);
                }
            } catch (error) {
                console.error("Failed to load invoices", error);
            } finally {
                setIsLoading(false);
            }
        },
        [activeFilter]
    );

    useEffect(() => {
        loadInvoices(1, "", activeFilter);
    }, [activeFilter, loadInvoices]);

    /** Fetch individual line-items when a row is expanded */
    const getInvoiceItems = async (
        invoice: InvoiceRow
    ): Promise<SelectableInvoiceItem[]> => {
        try {
            const response = await fetchAPI(
                `${API_ENDPOINTS.PURCHASES.RETURNS.SHOW}?id=${invoice.id}`
            );
            if (response.success && response.data) {
                return ((response.data as any).items as SelectableInvoiceItem[]) || [];
            }
            return [];
        } catch {
            return [];
        }
    };

    const columns: InvoiceTableColumn<InvoiceRow>[] = [
        {
            key: "invoice_number",
            header: "رقم الفاتورة",
            dataLabel: "رقم الفاتورة",
            render: (item) => (
                <span style={{ color: "var(--primary-color)", fontWeight: "bold" }}>
                    {item.invoice_number}
                </span>
            ),
        },
        {
            key: "created_at",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => (
                <span style={{ fontSize: "0.9em" }}>
                    {formatDateTime(item.created_at)}
                </span>
            ),
        },
        {
            key: "supplier_name" as any,
            header: "المورد",
            dataLabel: "المورد",
            render: (item) => (
                <span style={{ fontWeight: 500 }}>
                    {item.supplier?.name || (item as any).supplier_name || "—"}
                </span>
            ),
        },
        {
            key: "total_amount",
            header: "إجمالي الفاتورة",
            dataLabel: "الإجمالي",
            render: (item) => (
                <span style={{ fontWeight: "bold" }}>
                    {formatCurrency(item.total_amount)}
                </span>
            ),
        },
    ];

    return (
        <div className="sales-card animate-fade">
            <SelectableInvoiceTable
                columns={columns}
                invoices={invoices}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                onSelectionChange={onSelectionChange}
                onSearch={(query) => loadInvoices(1, query)}
                getInvoiceItems={getInvoiceItems}
                emptyMessage="لا توجد فواتير"
                multiInvoiceSelection={true}
                invoiceIdExtractor={(item) => item.id}
                isExpandable={() => true}
                openReturnDialog={openReturnDialog}
                searchPlaceholder="بحث برقم الفاتورة أو اسم المورد..."
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange: (page) => loadInvoices(page),
                }}
                FilterTabNavigation={
                    <TabSubNavigation
                        tabs={filterTabs}
                        activeTab={activeFilter}
                        onTabChange={(key) => setActiveFilter(key)}
                    />
                }
            />
        </div>
    );
}
