export interface Customer {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_number?: string;
    total_debt: number;
    total_paid: number;
    balance: number;
    current_balance?: number;
    created_at: string;
}
