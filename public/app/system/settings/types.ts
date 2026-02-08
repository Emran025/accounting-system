
export interface StoreSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  tax_number: string;
  cr_number: string;
}

export interface InvoiceSettings {
  show_logo: boolean;
  show_qr: boolean;
  zatca_enabled: boolean;
  footer_text: string;
  terms_text: string;
}

export interface ZatcaSettings {
  zatca_enabled: boolean;
  zatca_environment: 'sandbox' | 'production' | '';
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

export interface Session {
  id: number;
  device: string;
  ip_address: string;
  last_activity: string;
  is_current: boolean;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: RolePermission[];
}

export interface RolePermission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface ModuleData {
  id: number;
  module_key: string;
  module_name_ar: string;
  module_name_en: string;
  category: string;
}

export interface CurrencyDenomination {
  id?: number;
  value: number;
  label: string;
  image_path?: string;
}

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_primary: boolean;
  is_active: boolean;
  denominations?: CurrencyDenomination[];
}

export type CurrencyPolicyType = 'UNIT_OF_MEASURE' | 'VALUED_ASSET' | 'NORMALIZATION';
export type ConversionTiming = 'POSTING' | 'SETTLEMENT' | 'REPORTING' | 'NEVER';

export interface CurrencyPolicy {
  id: number;
  name: string;
  code: string;
  description: string;
  policy_type: CurrencyPolicyType;
  requires_reference_currency: boolean;
  allow_multi_currency_balances: boolean;
  conversion_timing: ConversionTiming;
  revaluation_enabled: boolean;
  revaluation_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PERIOD_END' | null;
  exchange_rate_source?: 'MANUAL' | 'CENTRAL_BANK' | 'API' | null;
  is_active: boolean;
}

export interface PolicyStatus {
  has_active_policy: boolean;
  policy_name?: string;
  policy_type?: CurrencyPolicyType;
  policy_type_label?: string;
  conversion_timing?: ConversionTiming;
  requires_posting_conversion?: boolean;
  allows_multi_currency_balances?: boolean;
  revaluation_enabled?: boolean;
  reference_currency?: Currency;
}
