export interface Product {
    id: number;
    name: string;
    stock_quantity: number;
    purchase_price: number;
}

export interface Purchase {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_type: string;
    unit_price: number;
    total_price: number;
    supplier?: string;
    purchase_date: string;
    expiry_date?: string;
    notes?: string;
    created_at: string;
    voucher_number?: string;
    approval_status?: string;
    vat_rate?: number;
    vat_amount?: number;
    payment_type?: string;
}

export interface PurchaseRequest {
    id: number;
    product_name: string;
    quantity: number;
    notes?: string;
    status: "pending" | "approved" | "done";
    created_at: string;
}

export interface Supplier {
    id: number;
    name: string;
    phone?: string;
}
