export interface SalesRepresentative {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    current_balance: number;
    total_sales: number;
    total_paid: number;
    created_at?: string;
}

export interface Pagination {
    total_records: number;
    total_pages: number;
    current_page: number;
}
