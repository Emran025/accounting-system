
export interface GovernmentFee {
    id: number;
    name: string;
    code?: string;
    percentage: number;
    fixed_amount?: number;
    account_id?: number | null;
    account?: {
        id: number;
        account_name: string;
        account_code: string;
    };
    is_active: boolean;
}

export interface Account {
    id: number;
    account_name: string;
    account_code: string;
    account_type: string;
}

export interface ZatcaSettings {
    zatca_enabled: boolean;
    zatca_environment: 'sandbox' | 'production' | 'simulation' | '';
    zatca_vat_number: string;
    zatca_org_name: string;
    zatca_org_unit_name: string;
    zatca_country_name: string;
    zatca_common_name: string;
    zatca_business_category: string;
    zatca_otp: string;
    zatca_csr: string;
    zatca_binary_token: string;
    zatca_secret: string;
    zatca_request_id: string;
}
