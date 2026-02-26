export interface Category {
    id: number;
    name: string;
}

export interface Product {
    id: number;
    name: string;
    barcode: string;
    category_id: number | null;
    category_name?: string;
    unit_price: number;
    minimum_profit_margin: number;
    stock_quantity: number;
    unit_name: string;
    items_per_unit: number;
    sub_unit_name: string | null;
    description?: string;
    created_at: string;
    // UI mapping
    selling_price?: number;
    purchase_price?: number;
    stock?: number;
    min_stock?: number;
    unit_type?: string;
    profit_margin?: number;
    expiry_date?: string;
}
