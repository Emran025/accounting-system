"use client";

import { formatCurrency } from "@/lib/utils";

export interface TaxLine {
  tax_type_code: string;
  tax_authority_code: string;
  rate: number;
  taxable_amount: number;
  tax_amount: number;
}

interface TaxBreakdownProps {
  /** Tax lines from Tax Engine (when tax_lines loaded) */
  taxLines?: TaxLine[];
  /** Fallback: legacy vat_amount when tax_lines not available */
  vatAmount?: number;
  /** Fallback: legacy vat_rate (0-1 e.g. 0.15) when tax_lines not available */
  vatRate?: number;
  /** Fallback: taxable amount for display */
  taxableAmount?: number;
  /** Compact display (single line) */
  compact?: boolean;
  /** RTL / Arabic labels */
  labels?: {
    taxBreakdown?: string;
    vat?: string;
    rate?: string;
    amount?: string;
    authority?: string;
  };
}

const defaultLabels = {
  taxBreakdown: "تفاصيل الضريبة",
  vat: "ضريبة القيمة المضافة",
  rate: "النسبة",
  amount: "المبلغ",
  authority: "الهيئة",
};

/**
 * TaxBreakdown - Displays multiple tax lines with authority attribution.
 * Part of EPIC #1: Tax Engine Transformation.
 * Supports both new tax_lines format and legacy vat_amount/vat_rate.
 */
export function TaxBreakdown({
  taxLines = [],
  vatAmount,
  vatRate,
  taxableAmount,
  compact = false,
  labels = {},
}: TaxBreakdownProps) {
  const l = { ...defaultLabels, ...labels };

  // New Tax Engine: multiple lines
  if (taxLines.length > 0) {
    if (compact) {
      const totalTax = taxLines.reduce((s, t) => s + t.tax_amount, 0);
      return (
        <div className="tax-breakdown compact">
          <span className="tax-label">{l.taxBreakdown}</span>
          <span className="tax-amount">{formatCurrency(totalTax)}</span>
        </div>
      );
    }
    return (
      <div className="tax-breakdown">
        <h4 style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>{l.taxBreakdown}</h4>
        {taxLines.map((line, idx) => (
          <div
            key={idx}
            className="tax-line"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.35rem 0",
              borderBottom: idx < taxLines.length - 1 ? "1px solid var(--border-color)" : "none",
            }}
          >
            <span>
              {line.tax_type_code} ({line.tax_authority_code}) {line.rate > 0 ? `– ${(line.rate * 100).toFixed(1)}%` : `– مقطوع`}
            </span>
            <span className="tax-amount">{formatCurrency(line.tax_amount)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Legacy: single VAT
  if (vatAmount !== undefined && vatAmount > 0) {
    const ratePct = vatRate !== undefined ? (vatRate * 100).toFixed(1) : "—";
    if (compact) {
      return (
        <div className="tax-breakdown compact">
          <span className="tax-label">{l.vat}</span>
          <span className="tax-amount">{formatCurrency(vatAmount)}</span>
        </div>
      );
    }
    return (
      <div className="tax-breakdown">
        <div
          className="tax-line"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.35rem 0",
          }}
        >
          <span>
            {l.vat} ({ratePct}%)
          </span>
          <span className="tax-amount">{formatCurrency(vatAmount)}</span>
        </div>
      </div>
    );
  }

  return null;
}
