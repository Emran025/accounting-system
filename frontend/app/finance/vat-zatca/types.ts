export interface Account {
    id: number;
    account_name: string;
    account_code: string;
    account_type: string;
}

export interface TaxRate {
    id: number;
    tax_type_id: number;
    rate: number;
    fixed_amount: number;
    effective_from: string;
    effective_to: string | null;
    is_default: boolean;
}

export interface TaxType {
    id: number;
    tax_authority_id: number;
    code: string;
    name: string;
    gl_account_code: string | null;
    calculation_type: 'percentage' | 'fixed_amount';
    applicable_areas: string | string[]; // Will be JSON array parsed optimally
    is_active: boolean;
    tax_rates?: TaxRate[];
}

export interface TaxAuthority {
    id: number;
    code: string;
    name: string;
    country_code: string;
    adapter_class: string | null;
    config: any;
    connection_type: 'push_api' | 'pull_key' | 'none';
    connection_credentials?: string;
    endpoint_url?: string;
    is_active: boolean;
    is_primary: boolean;
    tax_types?: TaxType[];
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
