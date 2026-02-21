
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
