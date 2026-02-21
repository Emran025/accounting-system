"use client";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Currency } from "@/app/finance/currency/types";

export function ExchangeRatesWidget() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    fetchAPI(API_ENDPOINTS.FINANCE.CURRENCIES.BASE).then(res => {
      if (res.success) {
        setCurrencies((res.data as Currency[]).filter(c => c.is_active));
      }
    });
  }, []);

  const primary = currencies.find(c => c.is_primary);

  // Logic to pivot display to SAR if available (Common for this region)
  const sar = currencies.find(c => c.code === 'SAR');
  const displayBase = sar || primary; // Default to SAR if found, else Primary

  // Filter currencies to display (exclude the base itself)
  const displayCurrencies = currencies.filter(c => c.code !== displayBase?.code && c.is_active);

  if (displayCurrencies.length === 0) return null;

  return (
    <div className="sales-card mb-4" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
        أسعار الصرف اليوم
        <span style={{ fontSize: "0.8em", color: "var(--text-secondary)", marginRight: "10px" }}>
          (مقابل {displayBase?.symbol})
        </span>
      </h3>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {displayCurrencies.map(curr => {
          // Calculate cross rate: (Foreign/Primary) / (Base/Primary)
          const baseRate = Number(displayBase?.exchange_rate) || 1;
          const currRate = Number(curr.exchange_rate) || 1;
          const crossRate = currRate / baseRate;

          return (
            <div key={curr.id} style={{
              padding: "0.5rem 1rem",
              background: "var(--background-secondary)",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <strong>{curr.code}</strong>
              <span style={{ color: "var(--text-secondary)" }}>=</span>
              <span style={{ fontWeight: "bold", color: "var(--primary-color)" }}>
                {crossRate.toFixed(2)}
              </span>
              <span style={{ fontSize: "0.9em" }}>
                {displayBase?.symbol}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
