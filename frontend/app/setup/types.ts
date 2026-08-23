export type Item = Record<string, unknown>;

export type ReadinessCheck = {
  key: string;
  complete: boolean;
};

export type OnboardingPhase = {
  id: "foundation" | "core_operations";
  ready: boolean;
  required_node_types: string[];
  missing_node_types: string[];
  unlinked_node_types?: string[];
  reason_codes: string[];
};

export type Onboarding = {
  policy_version: string;
  profile: string;
  baseline_ready: boolean;
  next_phase: "foundation" | "core_operations" | "module_activation";
  starter_module_keys: string[];
  starter_bundle_active?: boolean;
  missing_starter_module_keys?: string[];
  active_starter_module_keys?: string[];
  phases: {
    foundation: OnboardingPhase;
    core_operations: OnboardingPhase;
  };
};

export type OrganizationSize = "micro" | "small" | "medium" | "enterprise";

export type OrganizationProfile = {
  template_key: string;
  industry: string;
  organization_size: OrganizationSize;
  company_name: string;
  company_code: string;
  country_code: string;
  currency_id: number;
  primary_site_name?: string;
  primary_site_code?: string;
  factory_calendar_id?: number | null;
  language?: "ar-SA" | "en-US";
  inventory_enabled: boolean;
  applied_at?: string | null;
  created_nodes?: Record<string, string>;
};

export type OrganizationTemplate = {
  key: string;
  industry: string;
  requires_inventory: boolean;
  label_ar: string;
  label_en: string;
  description_ar: string;
  generated_types: string[];
};

export type OrganizationTemplateState = {
  profile: OrganizationProfile | null;
  templates: OrganizationTemplate[];
  is_applied: boolean;
  can_apply: boolean;
};

export type Readiness = {
  ready: boolean;
  context?: {
    org_node_uuid?: string | null;
    cost_center_id?: number | null;
    pos_terminal_id?: number | null;
  } | null;
  onboarding?: Onboarding;
  checks?: ReadinessCheck[];
  missing?: Array<{ key: string }>;
  accounting_readiness?: {
    open_fiscal_period: { ready: boolean };
    chart_of_accounts: { ready: boolean; missing_account_types?: string[] };
  };
};

export type MetaType = {
  id: string;
  display_name: string;
  display_name_ar?: string;
  attributes?: Array<{ attribute_key: string; is_mandatory: boolean }>;
};

export type OrgNode = {
  node_uuid: string;
  node_type_id: string;
  code: string;
  status: string;
  attributes_json?: Record<string, unknown>;
  meta_type?: MetaType;
};

export type SetupModule = {
  module_key: string;
  category?: string;
  module_name_ar?: string | null;
  module_name_en?: string | null;
  is_configuration_module: boolean;
  is_selected: boolean;
  is_operational: boolean;
  lifecycle: "configuration_access" | "not_selected" | "selected_pending_readiness" | "active";
};

export type SetupState = {
  setup_required: boolean;
  onboarding?: Onboarding;
  selected_module_keys: string[];
  active_module_keys: string[];
  pending_module_keys: string[];
  modules: SetupModule[];
  organization_template?: OrganizationTemplateState;
};

export type SelectOption = {
  value: string | number;
  label: string;
};
