"use client";

// ── Policy Types ──
export type PolicyType = "push" | "pull";

// ── Transmission Formats ──
export type TransmissionFormat = "json" | "xml" | "yml" | "excel";

// ── Editor Format (excludes excel since it's not editable as text) ──
export type EditorFormat = "json" | "xml" | "yml";

// ── Auth Types for Push ──
export type AuthType = "none" | "bearer" | "basic" | "oauth2" | "api_key";

// ── System Key Groups ──
export type SystemKeyGroup = "invoice" | "tax" | "seller" | "buyer" | "line_item" | "payment";

// ── System Key Definition ──
export interface SystemKey {
    key: string;
    label: string;
    type: "string" | "number" | "date" | "boolean";
    /** Group for categorized display in the keys panel */
    group?: SystemKeyGroup;
}

// ── Key Mapping Entry ──
export interface KeyMappingEntry {
    systemKey: string;
    entityKey: string;
    include: boolean;
}

// ── Compliance Profile ──
// Matches the Laravel model's JSON serialization ($fillable, $hidden, $appends)
export interface ComplianceProfile {
    id?: number;
    tax_authority_id: number;
    name: string;
    code: string;
    policy_type: PolicyType;
    transmission_format: TransmissionFormat;
    key_mapping: Record<string, string> | null;
    structure_template: string | null;
    // Push fields
    endpoint_url?: string | null;
    auth_type?: AuthType | null;
    auth_credentials?: string | null;   // Hidden from GET responses, only sent in POST/PUT
    request_headers?: Record<string, string> | null;
    http_method?: string;
    openapi_spec?: Record<string, unknown> | null;
    // Pull fields (access_token is $hidden – use token_preview instead)
    token_expires_at?: string | null;
    allowed_ips?: string[] | null;
    pull_endpoint_path?: string | null;
    // Appended attributes (computed by model)
    token_preview?: string | null;      // Truncated token for display
    pull_endpoint?: string | null;      // Full pull endpoint URL
    // Common
    is_active: boolean;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
    // Relations
    tax_authority?: {
        id: number;
        code: string;
        name: string;
    };
}

// ── Tax Authority (minimal for selector) ──
export interface TaxAuthority {
    id: number;
    code: string;
    name: string;
    country_code: string;
    is_active: boolean;
}

// ── Editor Props ──
export interface ComplianceProfileEditorProps {
    profile?: Partial<ComplianceProfile> | null;
    authorities: TaxAuthority[];
    onSave: (data: ComplianceProfile) => Promise<void>;
    onCancel: () => void;
    className?: string;
}

// ── Format Editor Props ──
export interface FormatEditorProps {
    format: EditorFormat;
    systemKeys: SystemKey[];
    keyMapping: Record<string, string>;
    structureTemplate: string;
    onKeyMappingChange: (mapping: Record<string, string>) => void;
    onStructureChange: (structure: string) => void;
    className?: string;
}
