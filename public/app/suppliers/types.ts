export interface Supplier {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_number?: string;
    credit_limit: number;
    payment_terms: number;
    current_balance: number;
    created_at: string;
}
