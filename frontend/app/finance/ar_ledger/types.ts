import { SelectableInvoice, SelectableInvoiceItem } from "@/components/ui";

export interface LedgerTransaction extends SelectableInvoice {
    transaction_date: string;
    type: "invoice" | "receipt" | "return";
    description?: string;
    amount: number;
    created_by?: string;
    is_deleted: boolean;
    reference_type?: string;
    reference_id?: number;
}

export interface Pagination {
    total_records: number;
    total_pages: number;
    current_page: number;
};
export interface LedgerStats {
    total_debit: number;
    total_credit: number;
    total_returns: number;
    total_receipts: number;
    balance: number;
    transaction_count: number;
}

export interface Customer {
    id: number;
    name: string;
    phone?: string;
    tax_number?: string;
}

// This interface is for the detailed view of an invoice
export interface DetailedInvoice extends SelectableInvoice {
    voucher_number?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_tax?: string;
    amount_paid?: number;
    vat_rate?: number;
    tax_lines?: Array<{
        tax_type_code: string;
        tax_authority_code: string;
        rate: number;
        taxable_amount: number;
        tax_amount: number;
    }>;
    items: Array<SelectableInvoiceItem & { product_name?: string }>;
}
