export interface PurchaseRequest {
    id: number;
    product_id: number | null;
    product_name: string | null;
    quantity: number;
    user_id: number | null;
    status: "pending" | "approved" | "rejected" | "done";
    notes: string | null;
    created_at: string;
    product?: {
        id: number;
        name: string;
        stock_quantity: number;
        low_stock_threshold: number;
    };
    user?: {
        id: number;
        name: string;
    };
}

export interface Product {
    id: number;
    name: string;
    stock_quantity: number;
    low_stock_threshold: number;
}
