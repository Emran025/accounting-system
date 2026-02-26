import { SelectableInvoice, SelectableInvoiceItem } from "@/components/ui";

export interface LedgerTransaction extends SelectableInvoice {
    transaction_date: string;
    type: "commission" | "payment" | "return" | "adjustment";
    description?: string;
    amount: number;
    created_by?: string;
    is_deleted: boolean;
    reference_type?: string;
    reference_id?: number | string;
    sales_representative_id: number;
}

export interface Pagination {
    total_records: number;
    total_pages: number;
    current_page: number;
}

export interface LedgerStats {
    total_commissions: number;
    total_payments: number;
    total_returns: number;
    balance: number;
    transaction_count: number;
}

export interface Representative {
    id: number;
    name: string;
    phone?: string;
    email?: string;
}

// This interface is for the detailed view of an invoice
export interface DetailedInvoice extends SelectableInvoice {
    voucher_number?: string;
    salesperson_name?: string;
    customer_name?: string;
    amount_paid?: number;
    items: Array<SelectableInvoiceItem & { product_name?: string }>;
}
