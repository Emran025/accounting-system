
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
