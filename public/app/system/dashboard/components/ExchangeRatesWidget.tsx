"use client";
import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { Currency } from "../../settings/types";

export function ExchangeRatesWidget() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
    fetchAPI("/api/currencies").then(res => {
      if (res.success) {
        setCurrencies((res.data as Currency[]).filter(c => c.is_active));
      }
    });
  }, []);

  const primary = currencies.find(c => c.is_primary);
  const foreign = currencies.filter(c => !c.is_primary);

  if (foreign.length === 0) return null;

  return (
    <div className="sales-card mb-4" style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>أسعار الصرف اليوم</h3>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
         {foreign.map(curr => (
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
                    {Number(curr.exchange_rate).toFixed(2)}
                 </span>
                 <span style={{ fontSize: "0.9em" }}>
                    {primary?.symbol}
                 </span>
             </div>
         ))}
      </div>
    </div>
  );
}
