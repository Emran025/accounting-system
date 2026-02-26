import { useState } from "react";
import {
    SelectableInvoiceTable,
    SelectedItem,
    SelectableInvoiceItem,
    InvoiceTableColumn,
    Button,
} from "@/components/ui";
import { TabSubNavigation } from "@/components/navigation/TabNavigation";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { LedgerTransaction } from "../../../finance/ap_ledger/types";


interface ReturnsTableProps {
    transactions: LedgerTransaction[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    setSearch: (query: string) => void;
    onPageChange: (page: number) => void;
    getInvoiceItems: (item: LedgerTransaction) => Promise<SelectableInvoiceItem[]>;
    onViewInvoice: (id: number) => void;
}

export function ReturnsTable({
    transactions,
    isLoading,
    currentPage,
    totalPages,
    setSearch,
    onPageChange,
    getInvoiceItems,
    onViewInvoice,
}: ReturnsTableProps) {
    const [activeTab, setActiveTab] = useState("all");

    const tabs = [
        { key: "all", label: "جميع المرتجعات", icon: "list" },
    ];

    const filteredTransactions = transactions.filter((t) => {
        if (activeTab === "all") return true;
        return (t as any).payment_type === activeTab;
    });

    const getPaymentTypeName = (paymentType: string) => {
        const types: Record<string, string> = {
            cash: "نقدي",
            credit: "آجل (ذمم)",
        };
        return types[paymentType] || paymentType;
    };

    const columns: InvoiceTableColumn<LedgerTransaction>[] = [
        {
            key: "id",
            header: "#",
            dataLabel: "#",
            render: (item) => (
                <span style={{ fontWeight: "bold" }}>
                    {item.id}
                </span>
            ),
        },
        {
            key: "transaction_date",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => (
                <span style={{ fontSize: "0.9em" }}>
                    {formatDateTime(item.transaction_date)}
                </span>
            ),
        },
        {
            key: "supplier_name" as any,
            header: "المورد",
            dataLabel: "المورد",
            render: (item) => {
                // Determine supplier name from item or relationship
                const sName = (item as any).supplier_name || (item as any).supplier?.name || "—";
                return (
                    <span style={{ fontWeight: 500 }}>
                        {sName}
                    </span>
                );
            }
        },
        {
            key: "description",
            header: "الوصف / السبب",
            dataLabel: "الوصف / السبب",
            render: (item) => (
                <div>
                    {item.description || "—"}
                </div>
            ),
        },
        {
            key: "related_invoice_number" as any,
            header: "رقم الفاتورة الأصلية",
            dataLabel: "رقم الفاتورة",
            render: (item) => (
                <span style={{ color: "var(--primary-color)", fontWeight: "bold" }}>
                    {(item as any).reference_id || item.invoice_number || "—"}
                </span>
            ),
        },
        {
            key: "amount",
            header: "المبلغ المرتجع (مدين)",
            dataLabel: "المبلغ المرتجع",
            render: (item) => (
                <span className="text-success font-bold">
                    {formatCurrency(item.amount)}
                </span>
            ),
        },
        {
            key: "created_by",
            header: "المستخدم",
            dataLabel: "المستخدم",
            render: (item) => {
                const uName = (item as any).created_by_name || (item as any).createdBy?.name || item.created_by || "—";
                return uName;
            }
        },
    ];

    const renderReturnDetails = (item: LedgerTransaction) => {
        const paymentType = (item as any).payment_type;
        const supplierName = (item as any).supplier_name || (item as any).supplier?.name;
        const relatedInvoice = (item as any).reference_id;

        return (
            <div
                style={{
                    padding: "1.5rem",
                    background: "var(--surface-hover)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "bold" }}>مرتجع من فاتورة:</span>
                    <span style={{ color: "var(--primary-color)", fontWeight: "bold" }}>
                        {relatedInvoice || item.invoice_number || "—"}
                    </span>
                </div>
                {supplierName && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: "bold" }}>المورد:</span>
                        <span>{supplierName}</span>
                    </div>
                )}
                {paymentType && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: "bold" }}>نوع المعاملة:</span>
                        <span
                            className={`badge ${paymentType === "credit" ? "badge-warning" : "badge-success"}`}
                        >
                            {getPaymentTypeName(paymentType)}
                        </span>
                    </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: "bold" }}>المبلغ المرتجع:</span>
                    <span style={{ color: "var(--success-color)", fontWeight: "bold", fontSize: "1.1em" }}>
                        {formatCurrency(item.amount)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="sales-card animate-fade">
            <SelectableInvoiceTable
                columns={columns}
                invoices={filteredTransactions}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                onSelectionChange={() => { /* read-only, no selection needed */ }}
                onSearch={setSearch}
                getInvoiceItems={getInvoiceItems}
                renderCustomExpandedRow={renderReturnDetails}
                emptyMessage="لا توجد مرتجعات"
                FilterTabNavigation={
                    <TabSubNavigation
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                }
                /* Returns are non-selectable — disable checkbox-based selection */
                multiInvoiceSelection={false}
                invoiceIdExtractor={(item) => Number(item.reference_id || item.id)}
                isExpandable={(item: LedgerTransaction) => !!item.reference_id}
                pagination={{
                    currentPage,
                    totalPages,
                    onPageChange,
                }}
                /* No return dialog needed on this read-only page */
                openReturnDialog={() => { }}
            />
        </div>
    );
}
